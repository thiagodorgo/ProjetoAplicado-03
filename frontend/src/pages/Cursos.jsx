import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API, AuthContext } from '@/App';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, BookOpen, Clock, Users, Edit, Trash2, Search, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { canWriteAdmin, isColaborador } from '@/utils/auth';

export default function Cursos() {
  const { user } = useContext(AuthContext);
  const canManageCursos = canWriteAdmin(user);
  const canEnroll = canManageCursos || isColaborador(user);
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Ordenação
  const [sortOption, setSortOption] = useState('none'); // none | alphaAsc | alphaDesc | longest | shortest
  // Busca
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    carga_horaria: '',
    modalidade: 'presencial',
    tipo_treinamento: '',
    publico_alvo: '',
    instrutores: '',
    permite_auto_inscricao: false
  });
  const [editFormData, setEditFormData] = useState({
    titulo: '',
    descricao: '',
    carga_horaria: '',
    modalidade: 'presencial',
    tipo_treinamento: '',
    publico_alvo: '',
    instrutores: '',
    permite_auto_inscricao: false
  });

  useEffect(() => {
    fetchCursos();
  }, []);

  const fetchCursos = async () => {
    try {
      const response = await axios.get(`${API}/cursos`);
      setCursos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    } finally {
      setLoading(false);
    }
  };

  // Normaliza título para evitar duplicatas (case/acento-insensível)
  const normalizeTitle = (t) => {
    if (!t) return "";
    return t
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacríticos
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Normalização de texto para busca
  const normalize = (t) => {
    if (!t) return '';
    return t
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Filtra por busca e aplica ordenação
  const displayedCourses = React.useMemo(() => {
    const q = normalize(search);
    let arr = q
      ? cursos.filter((c) => {
          const title = normalize(c.titulo);
          const desc = normalize(c.descricao || '');
          const publico = normalize(c.publico_alvo || '');
          const instr = normalize(c.instrutores || '');
          return (
            title.includes(q) || desc.includes(q) || publico.includes(q) || instr.includes(q)
          );
        })
      : [...cursos];

    switch (sortOption) {
      case 'alphaAsc':
        arr.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'pt', { sensitivity: 'base' }));
        break;
      case 'alphaDesc':
        arr.sort((a, b) => (b.titulo || '').localeCompare(a.titulo || '', 'pt', { sensitivity: 'base' }));
        break;
      case 'longest':
        arr.sort((a, b) => (Number(b.carga_horaria) || 0) - (Number(a.carga_horaria) || 0));
        break;
      case 'shortest':
        arr.sort((a, b) => (Number(a.carga_horaria) || 0) - (Number(b.carga_horaria) || 0));
        break;
      default:
        break;
    }
    return arr;
  }, [cursos, search, sortOption]);

  // Sugestões por similaridade simples (Levenshtein) quando não houver resultados
  const levenshtein = (a, b) => {
    a = normalize(a); b = normalize(b);
    const m = a.length, n = b.length;
    if (m === 0) return n; if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  const suggestions = React.useMemo(() => {
    const q = normalize(search);
    if (!q || displayedCourses.length > 0) return [];
    const scored = cursos.map((c) => ({ title: c.titulo, dist: levenshtein(q, c.titulo) }));
    scored.sort((a, b) => a.dist - b.dist);
    const maxDist = Math.max(1, Math.floor(q.length * 0.4));
    return scored.filter(s => s.dist <= maxDist).slice(0, 5).map(s => s.title);
  }, [cursos, search, displayedCourses.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checagem rápida no cliente para evitar duplicatas na mesma modalidade
    const nNew = normalizeTitle(formData.titulo);
    const existsSameTitleSameMod = cursos.some(
      (c) => normalizeTitle(c.titulo) === nNew && c.modalidade === formData.modalidade
    );
    if (existsSameTitleSameMod) {
      toast.error('Já existe um curso com este título nesta modalidade.');
      return;
    }

    // Aviso (não bloqueante) se existir curso com mesmo título em outra modalidade com carga horária muito próxima
    const similarOtherMod = cursos.filter(
      (c) => normalizeTitle(c.titulo) === nNew && c.modalidade !== formData.modalidade
    );
    if (similarOtherMod.length > 0) {
      const ch = Number(formData.carga_horaria || 0);
      const tooClose = similarOtherMod.some((c) => Math.abs((c.carga_horaria || 0) - ch) <= 2);
      if (tooClose) {
        toast.warning('Há um curso com o mesmo título em outra modalidade e carga horária muito próxima.');
      }
    }

    try {
      await axios.post(`${API}/cursos`, {
        ...formData,
        carga_horaria: parseInt(formData.carga_horaria),
        tags: []
      });
      toast.success('Curso criado com sucesso!');
      setDialogOpen(false);
      fetchCursos();
      resetForm();
    } catch (error) {
      // Garante que qualquer resposta de erro (objeto, array ou string) seja exibida corretamente
      let errMsg = 'Erro ao criar curso';
      const data = error.response?.data;
      if (typeof data === 'string') {
        errMsg = data;
      } else if (data?.detail) {
        if (Array.isArray(data.detail)) {
          // FastAPI/Pydantic validation errors usually vêm como array de objetos
          errMsg = data.detail
            .map((d) => {
              // d.loc costuma ser algo como ["body", "titulo"]
              let field = '';
              if (Array.isArray(d.loc)) {
                // remove chaves padrão como 'body', 'query', 'path', 'header', 'form'
                const skip = ['body', 'query', 'path', 'header', 'form'];
                field = d.loc.filter((p) => typeof p === 'string' && !skip.includes(p)).join('.');
              }
              const message = d.msg || (typeof d === 'string' ? d : JSON.stringify(d));
              return field ? `${field}: ${message}` : message;
            })
            .join(' | ');
        } else if (typeof data.detail === 'string') {
          errMsg = data.detail;
        } else if (typeof data.detail === 'object') {
          errMsg = JSON.stringify(data.detail);
        }
      } else if (data) {
        errMsg = JSON.stringify(data);
      }
      toast.error(errMsg);
    }
  };

  const openEdit = (curso) => {
    setEditingId(curso.id_curso);
    setEditFormData({
      titulo: curso.titulo || '',
      descricao: curso.descricao || '',
      carga_horaria: String(curso.carga_horaria ?? ''),
      modalidade: curso.modalidade || 'presencial',
      tipo_treinamento: curso.tipo_treinamento || '',
      publico_alvo: curso.publico_alvo || '',
      instrutores: curso.instrutores || '',
      permite_auto_inscricao: !!curso.permite_auto_inscricao
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await axios.put(`${API}/cursos/${editingId}`, {
        ...editFormData,
        carga_horaria: parseInt(editFormData.carga_horaria)
      });
      toast.success('Curso atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditingId(null);
      fetchCursos();
    } catch (error) {
      let errMsg = 'Erro ao atualizar curso';
      const data = error.response?.data;
      if (typeof data === 'string') {
        errMsg = data;
      } else if (data?.detail) {
        if (Array.isArray(data.detail)) {
          errMsg = data.detail
            .map((d) => {
              let field = '';
              if (Array.isArray(d.loc)) {
                const skip = ['body', 'query', 'path', 'header', 'form'];
                field = d.loc.filter((p) => typeof p === 'string' && !skip.includes(p)).join('.');
              }
              const message = d.msg || (typeof d === 'string' ? d : JSON.stringify(d));
              return field ? `${field}: ${message}` : message;
            })
            .join(' | ');
        } else if (typeof data.detail === 'string') {
          errMsg = data.detail;
        } else if (typeof data.detail === 'object') {
          errMsg = JSON.stringify(data.detail);
        }
      } else if (data) {
        errMsg = JSON.stringify(data);
      }
      toast.error(errMsg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente deletar este curso?')) return;
    
    try {
      await axios.delete(`${API}/cursos/${id}`);
      toast.success('Curso deletado com sucesso!');
      fetchCursos();
    } catch (error) {
      toast.error('Erro ao deletar curso');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      carga_horaria: '',
      modalidade: 'presencial',
      tipo_treinamento: '',
      publico_alvo: '',
      instrutores: '',
      permite_auto_inscricao: false
    });
  };

  const getModalidadeBadge = (modalidade) => {
    const styles = {
      presencial: 'bg-blue-100 text-blue-700',
      online_sincrono: 'bg-green-100 text-green-700',
      online_assincrono: 'bg-purple-100 text-purple-700'
    };
    const labels = {
      presencial: 'Presencial',
      online_sincrono: 'Online Síncrono',
      online_assincrono: 'Online Assíncrono'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[modalidade]}`}>
        {labels[modalidade]}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Cursos</h1>
            <p className="text-gray-600">Gerencie todos os cursos do sistema</p>
          </div>
          {canManageCursos && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg"
                  data-testid="create-curso-button"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Curso</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ...form fields... */}
                  <div>
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      required
                      data-testid="curso-titulo-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={3}
                      data-testid="curso-descricao-input"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="carga_horaria">Carga Horária (horas) *</Label>
                      <Input
                        id="carga_horaria"
                        type="number"
                        value={formData.carga_horaria}
                        onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
                        required
                        data-testid="curso-carga-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modalidade">Modalidade *</Label>
                      <Select
                        value={formData.modalidade}
                        onValueChange={(value) => setFormData({ ...formData, modalidade: value })}
                      >
                        <SelectTrigger data-testid="curso-modalidade-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="online_sincrono">Online Síncrono</SelectItem>
                          <SelectItem value="online_assincrono">Online Assíncrono</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tipo_treinamento">Tipo de Treinamento *</Label>
                      <Select
                        value={formData.tipo_treinamento}
                        onValueChange={(value) => setFormData({ ...formData, tipo_treinamento: value })}
                      >
                        <SelectTrigger data-testid="curso-tipo-treinamento-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nr31">NR31 - Segurança no Trabalho Rural</SelectItem>
                          <SelectItem value="operacao_maquinas">Operação de Máquinas</SelectItem>
                          <SelectItem value="agrotoxicos">Agrotóxicos</SelectItem>
                          <SelectItem value="primeiros_socorros">Primeiros Socorros</SelectItem>
                          <SelectItem value="prevencao_acidentes">Prevenção de Acidentes</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="publico_alvo">Público Alvo</Label>
                    <Input
                      id="publico_alvo"
                      value={formData.publico_alvo}
                      onChange={(e) => setFormData({ ...formData, publico_alvo: e.target.value })}
                      placeholder="Ex: Trabalhadores rurais"
                      data-testid="curso-publico-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instrutores">Instrutores</Label>
                    <Input
                      id="instrutores"
                      value={formData.instrutores}
                      onChange={(e) => setFormData({ ...formData, instrutores: e.target.value })}
                      placeholder="Ex: João Silva, Maria Santos"
                      data-testid="curso-instrutores-input"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="permite_auto_inscricao"
                      checked={formData.permite_auto_inscricao}
                      onChange={(e) => setFormData({ ...formData, permite_auto_inscricao: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                      data-testid="curso-auto-inscricao-checkbox"
                    />
                    <Label htmlFor="permite_auto_inscricao" className="cursor-pointer">
                      Permitir auto-inscrição
                    </Label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1" data-testid="curso-submit-button">
                      Criar Curso
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          
        </div>

        {/* Busca + Ordenação */}
        <div className="flex items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar cursos por título, descrição, público ou instrutor..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearch('')}
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Você quis dizer:</span>
                {suggestions.map((s, idx) => (
                  <Button key={idx} variant="outline" size="sm" onClick={() => setSearch(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Ordenação compacta + chip */}
          <div className="flex items-center gap-2">
            {sortOption !== 'none' && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {sortOption === 'alphaAsc' && 'Ordenado: A → Z'}
                {sortOption === 'alphaDesc' && 'Ordenado: Z → A'}
                {sortOption === 'longest' && 'Ordenado: mais longos'}
                {sortOption === 'shortest' && 'Ordenado: mais curtos'}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Ordenar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOption('alphaAsc')}>A → Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('alphaDesc')}>Z → A</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('longest')}>Cursos mais longos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('shortest')}>Cursos mais curtos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('none')}>Padrão</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Cursos Grid */}
        {cursos.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum curso cadastrado</h3>
              <p className="text-gray-600">Comece criando seu primeiro curso</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCourses.map((curso) => (
              <Card key={curso.id_curso} className="card-hover border-0 shadow-lg cursor-pointer" data-testid={`curso-card-${curso.id_curso}`} onClick={() => navigate(`/cursos/${curso.id_curso}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{curso.titulo}</CardTitle>
                      {getModalidadeBadge(curso.modalidade)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {curso.descricao || 'Sem descrição'}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{curso.carga_horaria}h</span>
                    </div>
                    {curso.publico_alvo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{curso.publico_alvo}</span>
                      </div>
                    )}
                  </div>

                  {(canManageCursos || canEnroll) && (
                    <div className="flex gap-2">
                      {canManageCursos && (
                        <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openEdit(curso); }}
                        className="flex-1"
                        data-testid={`edit-curso-${curso.id_curso}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(curso.id_curso); }}
                        className="text-red-600 hover:bg-red-50"
                        data-testid={`delete-curso-${curso.id_curso}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                        </>
                      )}
                      {canEnroll && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const userData = JSON.parse(localStorage.getItem('user'));
                            // Buscar inscrições do usuário
                            const resp = await axios.get(`${API}/inscricoes?id_colaborador=${userData.id_colaborador}`);
                            const jaInscrito = resp.data.some(insc => insc.id_curso === curso.id_curso);
                            if (jaInscrito) {
                              toast.warning('Você já está inscrito neste curso!');
                              return;
                            }
                            await axios.post(`${API}/inscricoes`, {
                              id_colaborador: userData.id_colaborador,
                              id_curso: curso.id_curso,
                              tipo_inscricao: 'manual'
                            });
                            toast.success('Inscrição realizada com sucesso!');
                          } catch (error) {
                            toast.error('Erro ao inscrever no curso');
                          }
                        }}
                        className="flex-1 bg-green-600 text-white"
                        data-testid={`inscrever-curso-${curso.id_curso}`}
                      >
                        Inscrever-se
                      </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {canManageCursos && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Curso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit_titulo">Título *</Label>
              <Input
                id="edit_titulo"
                value={editFormData.titulo}
                onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_descricao">Descrição</Label>
              <Textarea
                id="edit_descricao"
                value={editFormData.descricao}
                onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_carga_horaria">Carga Horária (horas) *</Label>
                <Input
                  id="edit_carga_horaria"
                  type="number"
                  value={editFormData.carga_horaria}
                  onChange={(e) => setEditFormData({ ...editFormData, carga_horaria: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_modalidade">Modalidade *</Label>
                <Select
                  value={editFormData.modalidade}
                  onValueChange={(value) => setEditFormData({ ...editFormData, modalidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online_sincrono">Online Síncrono</SelectItem>
                    <SelectItem value="online_assincrono">Online Assíncrono</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_tipo_treinamento">Tipo de Treinamento *</Label>
                <Select
                  value={editFormData.tipo_treinamento}
                  onValueChange={(value) => setEditFormData({ ...editFormData, tipo_treinamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nr31">NR31 - Segurança no Trabalho Rural</SelectItem>
                    <SelectItem value="operacao_maquinas">Operação de Máquinas</SelectItem>
                    <SelectItem value="agrotoxicos">Agrotóxicos</SelectItem>
                    <SelectItem value="primeiros_socorros">Primeiros Socorros</SelectItem>
                    <SelectItem value="prevencao_acidentes">Prevenção de Acidentes</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit_publico_alvo">Público Alvo</Label>
              <Input
                id="edit_publico_alvo"
                value={editFormData.publico_alvo}
                onChange={(e) => setEditFormData({ ...editFormData, publico_alvo: e.target.value })}
                placeholder="Ex: Trabalhadores rurais"
              />
            </div>
            <div>
              <Label htmlFor="edit_instrutores">Instrutores</Label>
              <Input
                id="edit_instrutores"
                value={editFormData.instrutores}
                onChange={(e) => setEditFormData({ ...editFormData, instrutores: e.target.value })}
                placeholder="Ex: João Silva, Maria Santos"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_permite_auto_inscricao"
                checked={editFormData.permite_auto_inscricao}
                onChange={(e) => setEditFormData({ ...editFormData, permite_auto_inscricao: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="edit_permite_auto_inscricao" className="cursor-pointer">
                Permitir auto-inscrição
              </Label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Salvar Alterações
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
