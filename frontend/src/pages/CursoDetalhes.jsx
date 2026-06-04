import React, { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import { API, AuthContext } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { canWriteAdmin, isColaborador } from '@/utils/auth';

function getModalidadeLabel(modalidade) {
  const labels = {
    presencial: 'Presencial',
    online_sincrono: 'Online Síncrono',
    online_assincrono: 'Online Assíncrono'
  };
  return labels[modalidade] || modalidade;
}

export default function CursoDetalhes() {
  const { user } = useContext(AuthContext);
  const { id } = useParams(); // id_curso
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);
  const [trilhas, setTrilhas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [cRes, tRes] = await Promise.all([
          axios.get(`${API}/cursos/${id}`),
          axios.get(`${API}/cursos/${id}/trilhas`)
        ]);
        if (!mounted) return;
        setCurso(cRes.data);
        setTrilhas(tRes.data || []);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Falha ao carregar detalhes do curso');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  const inscrever = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData?.id_colaborador) {
        toast.error('Usuário não autenticado.');
        return;
      }
      const resp = await axios.get(`${API}/inscricoes?id_colaborador=${userData.id_colaborador}`);
      const jaInscrito = resp.data.some((i) => i.id_curso === Number(id));
      if (jaInscrito) {
        toast.warning('Você já está inscrito neste curso!');
        return;
      }
      await axios.post(`${API}/inscricoes`, {
        id_colaborador: userData.id_colaborador,
        id_curso: Number(id),
        tipo_inscricao: 'manual'
      });
      toast.success('Inscrição realizada com sucesso!');
    } catch (e) {
      toast.error('Erro ao realizar inscrição');
    }
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

  if (!curso) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-red-600">Curso não encontrado.</p>
          <Button variant="link" onClick={() => navigate('/cursos')}>Voltar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{curso.titulo}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{getModalidadeLabel(curso.modalidade)}</Badge>
              <Badge variant="outline">{curso.carga_horaria}h</Badge>
              <Badge variant="outline">{curso.tipo_treinamento}</Badge>
              {curso.permite_auto_inscricao && <Badge variant="outline">Auto-inscrição</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/cursos')}>Voltar</Button>
            {(canWriteAdmin(user) || isColaborador(user)) && (
              <Button onClick={inscrever} className="bg-green-600 text-white">Inscrever-se</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle>Sobre o curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {curso.descricao && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Descrição</h3>
                  <p className="text-gray-700 mt-1">{curso.descricao}</p>
                </div>
              )}
              {curso.publico_alvo && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Público-alvo</h3>
                  <p className="text-gray-700 mt-1">{curso.publico_alvo}</p>
                </div>
              )}
              {curso.instrutores && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Instrutores</h3>
                  <p className="text-gray-700 mt-1">{curso.instrutores}</p>
                </div>
              )}
              {curso.conteudo_programatico && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Conteúdo programático</h3>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{curso.conteudo_programatico}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Trilhas relacionadas</CardTitle>
            </CardHeader>
            <CardContent>
              {trilhas.length === 0 ? (
                <p className="text-gray-600">Nenhuma trilha vinculada a este curso.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {trilhas.map((t) => (
                    <li key={t.id_trilha} className="text-gray-800">{t.titulo}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
