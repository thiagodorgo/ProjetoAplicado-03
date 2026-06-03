
# Desenvolvedores: Thiago, Fabricio, Pettrin, Joseph
# Sistema completo de gestão de treinamentos obrigatórios para trabalhadores

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import status as http_status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum
import unicodedata
from pymongo.errors import DuplicateKeyError

ROOT_DIR = Path(__file__).parent
# Try to load .env robustly. Some environments or editors create files with BOM
# or different encodings; try load_dotenv with utf-8 and fallback to manual parsing
dotenv_path = ROOT_DIR / '.env'
try:
    # python-dotenv supports an encoding argument in newer versions
    load_dotenv(dotenv_path, encoding='utf-8')
except TypeError:
    # Older versions may not accept encoding; fall back
    load_dotenv(dotenv_path)

# If MONGO_URL still isn't set, try reading the file manually using utf-8-sig
if 'MONGO_URL' not in os.environ:
    try:
        text = dotenv_path.read_text(encoding='utf-8-sig')
        for line in text.splitlines():
            if not line or line.strip().startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        # If reading fails, continue and let later code raise a helpful error
        pass

# Configuramos nossa conexão com MongoDB
raw_mongo = os.environ.get('MONGO_URL', '')
# Some editors/encodings or accidental writes can inject BOM/newlines into the .env
# or the environment may contain the whole file. Try to robustly extract the real
# MongoDB URI by locating the 'mongodb' substring and taking that line/value.
mongo_url = ''
if raw_mongo:
    # If the string contains 'mongodb', extract from there until the first whitespace/newline
    lower = raw_mongo.lower()
    idx = lower.find('mongodb')
    if idx != -1:
        # take from the 'mongodb' start to end of line
        tail = raw_mongo[idx:]
        mongo_url = tail.splitlines()[0].strip()
    else:
        # fallback: take first non-empty line
        for line in raw_mongo.splitlines():
            if line.strip():
                mongo_url = line.strip()
                break

if not mongo_url:
    raise RuntimeError('MONGO_URL environment variable is missing or empty')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'techsolutions_treinamentos')]

# Definimos as configurações JWT para autenticação
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Criamos nossa aplicação principal FastAPI
app = FastAPI(
    title="TechSolutions - Sistema de Treinamentos Obrigatórios",
    description="Gestão de treinamentos obrigatórios para trabalhadores rurais (NR-31)",
    version="2.0"
)
api_router = APIRouter(prefix="/api")
security = HTTPBearer()


def parse_cors_origins(cors_origins: Optional[str]) -> List[str]:
    if not cors_origins or not cors_origins.strip():
        return ["*"]

    cors_origins = cors_origins.strip().strip("\"'")
    if cors_origins.startswith("[") and "](" in cors_origins:
        cors_origins = cors_origins[1:cors_origins.index("](")]
    elif cors_origins.startswith("[") and cors_origins.endswith("]"):
        cors_origins = cors_origins[1:-1]

    origins = [
        origin.strip().strip("[]()\"'").strip()
        for origin in cors_origins.split(",")
    ]
    return [origin for origin in origins if origin] or ["*"]


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "techsolutions-api"}


@app.get("/api/")
async def api_root():
    return {
        "message": "TechSolutions - Sistema de Treinamentos Obrigatórios",
        "version": "2.0",
        "foco": "Gestão de treinamentos para trabalhadores rurais (NR-31)"
    }

# =============== ENUMERADORES ===============
# Aqui definimos nossos enumeradores para padronizar os valores no sistema
class Modalidade(str, Enum):
    PRESENCIAL = "presencial"
    ONLINE_SINCRONO = "online_sincrono"
    ONLINE_ASSINCRONO = "online_assincrono"

class StatusInscricao(str, Enum):
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    VENCIDO = "vencido"
    CANCELADO = "cancelado"

class TipoInscricao(str, Enum):
    MANUAL = "manual"
    AUTO_INSCRICAO = "auto_inscricao"
    AUTOMATICA = "automatica"

class TipoEvidencia(str, Enum):
    ASSINATURA_DIGITAL = "assinatura_digital"
    QR_CODE = "qr_code"
    LOG_ACESSO = "log_acesso"
    CERTIFICADO = "certificado"
    LISTA_PRESENCA = "lista_presenca"

class TipoTreinamento(str, Enum):
    NR31 = "nr31"  # Segurança no Trabalho Rural
    OPERACAO_MAQUINAS = "operacao_maquinas"
    AGROTOXICOS = "agrotoxicos"
    PRIMEIROS_SOCORROS = "primeiros_socorros"
    PREVENCAO_ACIDENTES = "prevencao_acidentes"
    OUTROS = "outros"

class AcaoAuditoria(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    SINCRONIZACAO = "SINCRONIZACAO"

# =============== MODELOS ===============
# Aqui definimos todos os nossos modelos de dados usando Pydantic
# Cada modelo representa uma entidade do nosso sistema

# Modelo de Área - Representa as áreas/departamentos da empresa
class AreaBase(BaseModel):
    nome: str
    departamento: Optional[str] = None
    localizacao: Optional[str] = None  # Guardamos a localização física da área rural

class AreaCreate(AreaBase):
    pass

class Area(AreaBase):
    id_area: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Cargo - Representa os cargos/funções dos colaboradores
class CargoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    requer_nr31: bool = False  # Indicamos se este cargo necessita treinamento NR-31 obrigatório

class CargoCreate(CargoBase):
    pass

class Cargo(CargoBase):
    id_cargo: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Perfil - Define os perfis de acesso ao sistema
class PerfilBase(BaseModel):
    nome: str
    permissoes: List[str] = []  # Armazenamos a lista de permissões do perfil

class PerfilCreate(PerfilBase):
    pass

class Perfil(PerfilBase):
    id_perfil: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Colaborador - Representa nossos trabalhadores rurais no sistema
class ColaboradorBase(BaseModel):
    nome: str
    email: EmailStr
    cpf: Optional[str] = None
    id_cargo: int
    id_area: int
    id_perfil: int
    id_gestor: Optional[int] = None
    data_admissao: Optional[datetime] = None
    ativo: bool = True

class ColaboradorCreate(ColaboradorBase):
    senha: str

class ColaboradorUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    id_cargo: Optional[int] = None
    id_area: Optional[int] = None
    id_perfil: Optional[int] = None
    id_gestor: Optional[int] = None
    senha: Optional[str] = None
    ativo: Optional[bool] = None

class Colaborador(ColaboradorBase):
    id_colaborador: int
    model_config = ConfigDict(extra="ignore")

class ColaboradorLogin(BaseModel):
    email: EmailStr
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    colaborador: Colaborador

# Modelo de Tag - Usamos tags para categorizar cursos e trilhas
class TagBase(BaseModel):
    nome: str
    cor: Optional[str] = None  # Definimos cores para facilitar identificação visual

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id_tag: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Curso/Treinamento - Núcleo do nosso sistema de treinamentos
class CursoBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    carga_horaria: int
    modalidade: Modalidade
    tipo_treinamento: TipoTreinamento
    norma_referencia: Optional[str] = None  # Registramos a norma referência (ex: "NR-31", "NR-12")
    publico_alvo: Optional[str] = None
    instrutores: Optional[str] = None
    permite_auto_inscricao: bool = False
    tags: Optional[List[int]] = []
    conteudo_programatico: Optional[str] = None

class CursoCreate(CursoBase):
    pass

class CursoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    carga_horaria: Optional[int] = None
    modalidade: Optional[Modalidade] = None
    tipo_treinamento: Optional[TipoTreinamento] = None
    norma_referencia: Optional[str] = None
    publico_alvo: Optional[str] = None
    instrutores: Optional[str] = None
    permite_auto_inscricao: Optional[bool] = None
    tags: Optional[List[int]] = None
    conteudo_programatico: Optional[str] = None

class Curso(CursoBase):
    id_curso: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Trilha - Organizamos cursos em trilhas de aprendizagem
class TrilhaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    tags: Optional[List[int]] = []
    obrigatoria: bool = False  # Se a trilha é obrigatória

class TrilhaCreate(TrilhaBase):
    pass

class TrilhaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tags: Optional[List[int]] = None
    obrigatoria: Optional[bool] = None

class Trilha(TrilhaBase):
    id_trilha: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Curso_Trilha - Gerenciamos a relação entre cursos e trilhas
class CursoTrilhaBase(BaseModel):
    id_curso: int
    id_trilha: int
    ordem: int
    id_prerequisito: Optional[int] = None
    obrigatorio: bool = True

class CursoTrilhaCreate(CursoTrilhaBase):
    pass

class CursoTrilha(CursoTrilhaBase):
    id_curso_trilha: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Regra de Treinamento Obrigatório - Definimos quais treinamentos são obrigatórios
class RegraObrigatorioBase(BaseModel):
    id_curso: Optional[int] = None
    id_trilha: Optional[int] = None
    id_cargo: Optional[int] = None
    id_area: Optional[int] = None
    validade_certificado_meses: int
    alerta_vencimento_dias: int = 30  # Dias antes do vencimento para alertar
    descricao: Optional[str] = None

class RegraObrigatorioCreate(RegraObrigatorioBase):
    pass

class RegraObrigatorio(RegraObrigatorioBase):
    id_regra: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Inscrição - Controlamos as inscrições dos colaboradores nos cursos
class InscricaoBase(BaseModel):
    id_colaborador: int
    id_curso: int
    data_inscricao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_prevista: Optional[datetime] = None
    status: StatusInscricao = StatusInscricao.PENDENTE
    tipo_inscricao: TipoInscricao = TipoInscricao.MANUAL
    data_conclusao: Optional[datetime] = None
    nota: Optional[float] = None
    aprovado: bool = False

class InscricaoCreate(BaseModel):
    id_colaborador: int
    id_curso: int
    data_prevista: Optional[datetime] = None
    tipo_inscricao: TipoInscricao = TipoInscricao.MANUAL

class InscricaoUpdate(BaseModel):
    status: Optional[StatusInscricao] = None
    data_conclusao: Optional[datetime] = None
    data_prevista: Optional[datetime] = None
    nota: Optional[float] = None
    aprovado: Optional[bool] = None

class Inscricao(InscricaoBase):
    id_inscricao: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Progresso - Acompanhamos o progresso de cada colaborador
class ProgressoBase(BaseModel):
    id_inscricao: int
    percentual: float = 0.0
    status: StatusInscricao = StatusInscricao.PENDENTE
    data_conclusao: Optional[datetime] = None
    observacoes: Optional[str] = None

class ProgressoCreate(BaseModel):
    id_inscricao: int

class ProgressoUpdate(BaseModel):
    percentual: Optional[float] = None
    status: Optional[StatusInscricao] = None
    data_conclusao: Optional[datetime] = None
    observacoes: Optional[str] = None

class Progresso(ProgressoBase):
    id_progresso: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Evidência de Participação - Registramos evidências de participação nos treinamentos
class EvidenciaBase(BaseModel):
    id_inscricao: int
    tipo_evidencia: TipoEvidencia
    url_arquivo: Optional[str] = None
    data_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    descricao: Optional[str] = None

class EvidenciaCreate(BaseModel):
    id_inscricao: int
    tipo_evidencia: TipoEvidencia
    url_arquivo: Optional[str] = None
    descricao: Optional[str] = None

class Evidencia(EvidenciaBase):
    id_evidencia: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Certificado - Emitimos e gerenciamos certificados digitais
class CertificadoBase(BaseModel):
    id_inscricao: int
    data_emissao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_validade: Optional[datetime] = None
    codigo_verificacao: Optional[str] = None
    status: str = "ativo"  # ativo, vencido, revogado

class CertificadoCreate(BaseModel):
    id_inscricao: int
    data_validade: Optional[datetime] = None

class Certificado(CertificadoBase):
    id_certificado: int
    model_config = ConfigDict(extra="ignore")

# Modelo de Auditoria - Mantemos log completo de todas ações no sistema
class AuditoriaBase(BaseModel):
    id_colaborador_acao: int
    acao: AcaoAuditoria
    nome_tabela: str
    id_registro_afetado: Optional[int] = None
    ip_origem: Optional[str] = None
    dados_antigos: Optional[str] = None
    dados_novos: Optional[str] = None
    data_hora: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditoriaCreate(BaseModel):
    id_colaborador_acao: int
    acao: AcaoAuditoria
    nome_tabela: str
    id_registro_afetado: Optional[int] = None
    ip_origem: Optional[str] = None
    dados_antigos: Optional[str] = None
    dados_novos: Optional[str] = None

class Auditoria(AuditoriaBase):
    id_auditoria: int
    model_config = ConfigDict(extra="ignore")

# =============== FUNÇÕES AUXILIARES ===============
# Aqui criamos funções que utilizamos em várias partes do sistema

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_next_id(collection_name: str) -> int:
    # Geramos IDs sequenciais para nossas coleções do MongoDB
    counter = await db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return counter["seq"] if counter else 1

# Normaliza título para comparação/índice case/acento-insensível
def slugify_title(t: str) -> str:
    if not t:
        return ""
    t = t.strip().lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    cleaned = []
    for ch in t:
        if ch.isalnum():
            cleaned.append(ch)
        elif ch.isspace() or ch in "-_./":
            cleaned.append("-")
    s = "".join(cleaned)
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-")

# =============== ROTAS DE AUTENTICAÇÃO ===============
# Implementamos login e registro seguro com JWT

@api_router.post("/auth/register", response_model=Colaborador)
async def register(colaborador: ColaboradorCreate):
    existing = await db.colaboradores.find_one({"email": colaborador.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    senha_hash = hash_password(colaborador.senha)
    id_colaborador = await get_next_id("colaboradores")
    
    doc = {
        "id_colaborador": id_colaborador,
        "nome": colaborador.nome,
        "email": colaborador.email,
        "cpf": colaborador.cpf,
        "senha_hash": senha_hash,
        "id_cargo": colaborador.id_cargo,
        "id_area": colaborador.id_area,
        "id_perfil": colaborador.id_perfil,
        "id_gestor": colaborador.id_gestor,
        "data_admissao": colaborador.data_admissao.isoformat() if colaborador.data_admissao else None,
        "ativo": colaborador.ativo
    }
    
    await db.colaboradores.insert_one(doc)
    return Colaborador(**{k: v for k, v in doc.items() if k != 'senha_hash'})

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: ColaboradorLogin):
    colab = await db.colaboradores.find_one({"email": credentials.email})
    if not colab or not verify_password(credentials.senha, colab["senha_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not colab.get("ativo", True):
        raise HTTPException(status_code=403, detail="Colaborador inativo")
    
    token = create_access_token({"sub": str(colab["id_colaborador"]), "email": colab["email"]})
    
    await db.auditoria.insert_one({
        "id_auditoria": await get_next_id("auditoria"),
        "id_colaborador_acao": colab["id_colaborador"],
        "acao": AcaoAuditoria.LOGIN.value,
        "nome_tabela": "colaboradores",
        "data_hora": datetime.now(timezone.utc).isoformat()
    })
    
    return Token(
        access_token=token,
        token_type="bearer",
        colaborador=Colaborador(**{k: v for k, v in colab.items() if k != 'senha_hash'})
    )

# [Continuing with all CRUD routes from previous code...]
# I'll include key routes to stay within limits



# =============== ROTAS DE CURSO_TRILHA ===============
# Permite vincular cursos a trilhas
from fastapi import Body

# Endpoint para vincular curso a trilha
@api_router.post("/curso_trilha")
async def vincular_curso_trilha(
    payload: dict = Body(...),
    token: dict = Depends(verify_token)
):
    # payload: {id_curso, id_trilha, ordem, obrigatorio, id_prerequisito (opcional)}
    id_curso = payload.get("id_curso")
    id_trilha = payload.get("id_trilha")
    ordem = payload.get("ordem", 1)
    obrigatorio = payload.get("obrigatorio", True)
    id_prerequisito = payload.get("id_prerequisito")
    if not id_curso or not id_trilha:
        raise HTTPException(status_code=400, detail="id_curso e id_trilha são obrigatórios")
    # Gera novo id_curso_trilha
    id_curso_trilha = await get_next_id("curso_trilha")
    doc = {
        "id_curso_trilha": id_curso_trilha,
        "id_curso": id_curso,
        "id_trilha": id_trilha,
        "ordem": ordem,
        "obrigatorio": obrigatorio,
    }
    if id_prerequisito:
        doc["id_prerequisito"] = id_prerequisito
    result = await db.curso_trilha.insert_one(doc)
    if '_id' in doc:
        del doc['_id']
    return {"message": "Curso vinculado à trilha com sucesso", **doc}

@api_router.post("/cargos", response_model=Cargo)
async def create_cargo(cargo: CargoCreate, token: dict = Depends(verify_token)):
    id_cargo = await get_next_id("cargos")
    doc = {"id_cargo": id_cargo, **cargo.model_dump()}
    await db.cargos.insert_one(doc)
    return Cargo(**doc)

@api_router.get("/cargos", response_model=List[Cargo])
async def get_cargos(token: dict = Depends(verify_token)):
    cargos = await db.cargos.find({}, {"_id": 0}).to_list(1000)
    return cargos

@api_router.delete("/cargos/{id_cargo}")
async def delete_cargo(id_cargo: int, token: dict = Depends(verify_token)):
    result = await db.cargos.delete_one({"id_cargo": id_cargo})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    return {"message": "Cargo deletado com sucesso"}

# =============== ROTAS DE PERFIL ===============
# Controlamos perfis de acesso e permissões

@api_router.post("/perfis", response_model=Perfil)
async def create_perfil(perfil: PerfilCreate, token: dict = Depends(verify_token)):
    id_perfil = await get_next_id("perfis")
    doc = {"id_perfil": id_perfil, **perfil.model_dump()}
    await db.perfis.insert_one(doc)
    return Perfil(**doc)

@api_router.get("/perfis", response_model=List[Perfil])
async def get_perfis(token: dict = Depends(verify_token)):
    perfis = await db.perfis.find({}, {"_id": 0}).to_list(1000)
    return perfis

# =============== ROTAS DE COLABORADOR ===============
# Gerenciamos nossos trabalhadores rurais

@api_router.get("/colaboradores", response_model=List[Colaborador])
async def get_colaboradores(ativo: Optional[bool] = None, token: dict = Depends(verify_token)):
    query = {}
    if ativo is not None:
        query["ativo"] = ativo
    colaboradores = await db.colaboradores.find(query, {"_id": 0, "senha_hash": 0}).to_list(1000)
    return colaboradores

@api_router.get("/colaboradores/{id_colaborador}", response_model=Colaborador)
async def get_colaborador(id_colaborador: int, token: dict = Depends(verify_token)):
    colab = await db.colaboradores.find_one({"id_colaborador": id_colaborador}, {"_id": 0, "senha_hash": 0})
    if not colab:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return Colaborador(**colab)

# =============== ROTAS DE CURSO ===============
# Criamos e gerenciamos os treinamentos obrigatórios

@api_router.post("/cursos", response_model=Curso)
async def create_curso(curso: CursoCreate, token: dict = Depends(verify_token)):
    # Permissão aberta para todos os usuários
    id_curso = await get_next_id("cursos")
    data = curso.model_dump()
    # Converter enums para valores string antes de salvar
    if isinstance(data.get("modalidade"), Enum):
        data["modalidade"] = data["modalidade"].value
    if isinstance(data.get("tipo_treinamento"), Enum):
        data["tipo_treinamento"] = data["tipo_treinamento"].value

    doc = {"id_curso": id_curso, **data}
    # slug para unicidade por (titulo, modalidade)
    doc["slug"] = slugify_title(doc.get("titulo", ""))
    try:
        await db.cursos.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Já existe um curso com este título nesta modalidade.")
    # Remover campos extras ao responder, Pydantic ignora extras
    return Curso(**{k: v for k, v in doc.items() if k != "slug"})

@api_router.get("/cursos", response_model=List[Curso])
async def get_cursos(tipo: Optional[TipoTreinamento] = None, token: dict = Depends(verify_token)):
    query = {}
    if tipo:
        query["tipo_treinamento"] = tipo.value
    cursos = await db.cursos.find(query, {"_id": 0}).to_list(1000)
    return cursos

@api_router.get("/cursos/{id_curso}", response_model=Curso)
async def get_curso(id_curso: int, token: dict = Depends(verify_token)):
    curso = await db.cursos.find_one({"id_curso": id_curso}, {"_id": 0})
    if not curso:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return Curso(**curso)

@api_router.put("/cursos/{id_curso}", response_model=Curso)
async def update_curso(id_curso: int, update: CursoUpdate, token: dict = Depends(verify_token)):
    existing = await db.cursos.find_one({"id_curso": id_curso})
    if not existing:
        raise HTTPException(status_code=404, detail="Curso não encontrado")

    data = update.model_dump(exclude_unset=True)
    # Converter enums para seus valores string antes de salvar
    if "modalidade" in data and data["modalidade"] is not None:
        try:
            data["modalidade"] = data["modalidade"].value
        except AttributeError:
            pass
    if "tipo_treinamento" in data and data["tipo_treinamento"] is not None:
        try:
            data["tipo_treinamento"] = data["tipo_treinamento"].value
        except AttributeError:
            pass
    if "carga_horaria" in data and data["carga_horaria"] is not None:
        # garantir tipo numérico inteiro
        try:
            data["carga_horaria"] = int(data["carga_horaria"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="carga_horaria inválida")

    # Se o título mudar, recalcula slug; se modalidade mudar, a combinação slug+modalidade muda
    new_title = data.get("titulo")
    if new_title is not None:
        data["slug"] = slugify_title(new_title)
    elif existing.get("slug") is None and existing.get("titulo"):
        # backfill slug se ainda não existir
        data["slug"] = slugify_title(existing.get("titulo"))

    if not data:
        # Nada para atualizar
        doc = await db.cursos.find_one({"id_curso": id_curso}, {"_id": 0})
        return Curso(**doc)

    try:
        await db.cursos.update_one({"id_curso": id_curso}, {"$set": data})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Conflito: já existe curso com este título nesta modalidade.")
    updated = await db.cursos.find_one({"id_curso": id_curso}, {"_id": 0, "slug": 0})
    return Curso(**updated)

@api_router.delete("/cursos/{id_curso}")
async def delete_curso(id_curso: int, token: dict = Depends(verify_token)):
    # Permissão aberta para todos os usuários
    result = await db.cursos.delete_one({"id_curso": id_curso})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return {"message": "Curso deletado com sucesso"}


# =============== ROTAS DE TRILHA ===============
# Organizamos cursos em trilhas de desenvolvimento

@api_router.post("/trilhas", response_model=Trilha)
async def create_trilha(trilha: TrilhaCreate, token: dict = Depends(verify_token)):
    # Permissão aberta para todos os usuários
    id_trilha = await get_next_id("trilhas")
    doc = {"id_trilha": id_trilha, **trilha.model_dump()}
    await db.trilhas.insert_one(doc)
    return Trilha(**doc)

@api_router.get("/trilhas", response_model=List[Trilha])
async def get_trilhas(obrigatoria: Optional[bool] = None, token: dict = Depends(verify_token)):
    query = {}
    if obrigatoria is not None:
        query["obrigatoria"] = obrigatoria
    trilhas = await db.trilhas.find(query, {"_id": 0}).to_list(1000)
    return trilhas

@api_router.get("/cursos/{id_curso}/trilhas", response_model=List[Trilha])
async def get_trilhas_do_curso(id_curso: int, token: dict = Depends(verify_token)):
    # Busca todos os ids de trilha associados ao curso
    curso_trilhas = await db.curso_trilha.find({"id_curso": id_curso}, {"_id": 0, "id_trilha": 1}).to_list(100)
    trilha_ids = [ct["id_trilha"] for ct in curso_trilhas]
    if not trilha_ids:
        return []
    trilhas = await db.trilhas.find({"id_trilha": {"$in": trilha_ids}}, {"_id": 0}).to_list(100)
    return trilhas

@api_router.delete("/trilhas/{id_trilha}")
async def delete_trilha(id_trilha: int, token: dict = Depends(verify_token)):
    # Permissão aberta para todos os usuários
    result = await db.trilhas.delete_one({"id_trilha": id_trilha})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trilha não encontrada")
    return {"message": "Trilha deletada com sucesso"}

# =============== ROTAS DE REGRA OBRIGATÓRIA ===============
# Definimos regras de treinamentos obrigatórios por cargo/área

@api_router.post("/regras-obrigatorias", response_model=RegraObrigatorio)
async def create_regra(regra: RegraObrigatorioCreate, token: dict = Depends(verify_token)):
    if not regra.id_curso and not regra.id_trilha:
        raise HTTPException(status_code=400, detail="Deve especificar id_curso ou id_trilha")
    
    id_regra = await get_next_id("regras_obrigatorias")
    doc = {"id_regra": id_regra, **regra.model_dump()}
    await db.regras_obrigatorias.insert_one(doc)
    return RegraObrigatorio(**doc)

@api_router.get("/regras-obrigatorias", response_model=List[RegraObrigatorio])
async def get_regras(token: dict = Depends(verify_token)):
    regras = await db.regras_obrigatorias.find({}, {"_id": 0}).to_list(1000)
    return regras

@api_router.delete("/regras-obrigatorias/{id_regra}")
async def delete_regra(id_regra: int, token: dict = Depends(verify_token)):
    result = await db.regras_obrigatorias.delete_one({"id_regra": id_regra})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    return {"message": "Regra deletada com sucesso"}

# =============== ROTAS DE INSCRIÇÃO ===============
# Gerenciamos inscrições dos colaboradores nos cursos

@api_router.post("/inscricoes", response_model=Inscricao)
async def create_inscricao(inscricao: InscricaoCreate, token: dict = Depends(verify_token)):
    id_inscricao = await get_next_id("inscricoes")
    doc = {
        "id_inscricao": id_inscricao,
        "id_colaborador": inscricao.id_colaborador,
        "id_curso": inscricao.id_curso,
        "data_inscricao": datetime.now(timezone.utc).isoformat(),
        "data_prevista": inscricao.data_prevista.isoformat() if inscricao.data_prevista else None,
        "status": StatusInscricao.PENDENTE.value,
        "tipo_inscricao": inscricao.tipo_inscricao.value,
        "data_conclusao": None,
        "nota": None,
        "aprovado": False
    }
    await db.inscricoes.insert_one(doc)
    
    # Criamos automaticamente o registro de progresso
    id_progresso = await get_next_id("progressos")
    await db.progressos.insert_one({
        "id_progresso": id_progresso,
        "id_inscricao": id_inscricao,
        "percentual": 0.0,
        "status": StatusInscricao.PENDENTE.value,
        "data_conclusao": None,
        "observacoes": None
    })
    
    doc["data_inscricao"] = datetime.fromisoformat(doc["data_inscricao"])
    if doc["data_prevista"]:
        doc["data_prevista"] = datetime.fromisoformat(doc["data_prevista"])
    return Inscricao(**doc)

@api_router.get("/inscricoes", response_model=List[Inscricao])
async def get_inscricoes(
    id_colaborador: Optional[int] = None,
    id_curso: Optional[int] = None,
    status: Optional[StatusInscricao] = None,
    token: dict = Depends(verify_token)
):
    query = {}
    if id_colaborador:
        query["id_colaborador"] = id_colaborador
    if id_curso:
        query["id_curso"] = id_curso
    if status:
        query["status"] = status.value
    
    inscricoes = await db.inscricoes.find(query, {"_id": 0}).to_list(1000)
    for insc in inscricoes:
        if isinstance(insc["data_inscricao"], str):
            insc["data_inscricao"] = datetime.fromisoformat(insc["data_inscricao"])
        if insc.get("data_prevista") and isinstance(insc["data_prevista"], str):
            insc["data_prevista"] = datetime.fromisoformat(insc["data_prevista"])
        if insc.get("data_conclusao") and isinstance(insc["data_conclusao"], str):
            insc["data_conclusao"] = datetime.fromisoformat(insc["data_conclusao"])
    return inscricoes

# =============== ROTAS DE CERTIFICADO ===============
# Emitimos e validamos certificados digitais

@api_router.post("/certificados", response_model=Certificado)
async def create_certificado(certificado: CertificadoCreate, token: dict = Depends(verify_token)):
    inscricao = await db.inscricoes.find_one({"id_inscricao": certificado.id_inscricao})
    if not inscricao:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    
    id_certificado = await get_next_id("certificados")
    import uuid
    doc = {
        "id_certificado": id_certificado,
        "id_inscricao": certificado.id_inscricao,
        "data_emissao": datetime.now(timezone.utc).isoformat(),
        "data_validade": certificado.data_validade.isoformat() if certificado.data_validade else None,
        "codigo_verificacao": str(uuid.uuid4())[:8].upper(),
        "status": "ativo"
    }
    await db.certificados.insert_one(doc)
    
    doc["data_emissao"] = datetime.fromisoformat(doc["data_emissao"])
    if doc["data_validade"]:
        doc["data_validade"] = datetime.fromisoformat(doc["data_validade"])
    return Certificado(**doc)

@api_router.get("/certificados", response_model=List[Certificado])
async def get_certificados(
    id_inscricao: Optional[int] = None,
    status: Optional[str] = None,
    token: dict = Depends(verify_token)
):
    query = {}
    if id_inscricao:
        query["id_inscricao"] = id_inscricao
    if status:
        query["status"] = status
        
    certificados = await db.certificados.find(query, {"_id": 0}).to_list(1000)
    for cert in certificados:
        if isinstance(cert["data_emissao"], str):
            cert["data_emissao"] = datetime.fromisoformat(cert["data_emissao"])
        if cert.get("data_validade") and isinstance(cert["data_validade"], str):
            cert["data_validade"] = datetime.fromisoformat(cert["data_validade"])
    return certificados

# =============== DASHBOARD E RELATÓRIOS ===============
# Fornecemos estatísticas e relatórios do sistema

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(token: dict = Depends(verify_token)):
    total_cursos = await db.cursos.count_documents({})
    total_colaboradores = await db.colaboradores.count_documents({"ativo": True})
    total_inscricoes = await db.inscricoes.count_documents({})
    inscricoes_concluidas = await db.inscricoes.count_documents({"status": StatusInscricao.CONCLUIDO.value})
    inscricoes_pendentes = await db.inscricoes.count_documents({"status": StatusInscricao.PENDENTE.value})
    certificados_vencidos = await db.certificados.count_documents({"status": "vencido"})
    
    return {
        "total_cursos": total_cursos,
        "total_colaboradores": total_colaboradores,
        "total_inscricoes": total_inscricoes,
        "inscricoes_concluidas": inscricoes_concluidas,
        "inscricoes_pendentes": inscricoes_pendentes,
        "certificados_vencidos": certificados_vencidos,
        "taxa_conclusao": round((inscricoes_concluidas / total_inscricoes * 100) if total_inscricoes > 0 else 0, 2)
    }

# Incluímos nosso router na aplicação
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=parse_cors_origins(os.environ.get("CORS_ORIGINS")),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def ensure_indexes():
    # Índice único em (slug, modalidade) para evitar duplicidade de título por modalidade.
    # partialFilterExpression evita conflitos com documentos antigos sem slug.
    try:
        await db.cursos.create_index(
            [("slug", 1), ("modalidade", 1)],
            unique=True,
            name="uniq_slug_modalidade",
            background=True,
            partialFilterExpression={"slug": {"$exists": True}}
        )
    except Exception:
        # Se o índice já existe ou qualquer outro erro não-crítico, seguimos em frente
        pass


@api_router.post("/curso_trilha")
async def vincular_curso_trilha(
    payload: dict = Body(...),
    token: dict = Depends(verify_token)
):
    # payload: {id_curso, id_trilha, ordem, obrigatorio, id_prerequisito (opcional)}
    id_curso = payload.get("id_curso")
    id_trilha = payload.get("id_trilha")
    ordem = payload.get("ordem", 1)
    obrigatorio = payload.get("obrigatorio", True)
    id_prerequisito = payload.get("id_prerequisito")
    if not id_curso or not id_trilha:
        raise HTTPException(status_code=400, detail="id_curso e id_trilha são obrigatórios")
    # Gera novo id_curso_trilha
    id_curso_trilha = await get_next_id("curso_trilha")
    doc = {
        "id_curso_trilha": id_curso_trilha,
        "id_curso": id_curso,
        "id_trilha": id_trilha,
        "ordem": ordem,
        "obrigatorio": obrigatorio,
    }
    if id_prerequisito:
        doc["id_prerequisito"] = id_prerequisito
    await db.curso_trilha.insert_one(doc)
    return {"message": "Curso vinculado à trilha com sucesso", **doc}

@api_router.get("/")
async def root():
    return {
        "message": "TechSolutions - Sistema de Treinamentos Obrigatórios",
        "version": "2.0",
        "foco": "Gestão de treinamentos para trabalhadores rurais (NR-31)"
    }
