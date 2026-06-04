import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Route, Trash2 } from 'lucide-react';
import { canWriteAdmin } from '@/utils/auth';

export default function Trilhas() {
  const { user } = useContext(AuthContext);
  const canManageTrilhas = canWriteAdmin(user);
  const [trilhas, setTrilhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: ''
  });
  const [cursos, setCursos] = useState([]);
  const [selectedCursos, setSelectedCursos] = useState([]);


  useEffect(() => {
    fetchTrilhas();
    fetchCursos();
  }, []);

  const fetchCursos = async () => {
    try {
      const response = await axios.get(`${API}/cursos`);
      setCursos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    }
  };

  const fetchTrilhas = async () => {
    try {
      const response = await axios.get(`${API}/trilhas`);
      setTrilhas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar trilhas');
    } finally {
      setLoading(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      // Cria a trilha
      const trilhaResp = await axios.post(`${API}/trilhas`, {
        ...formData,
        tags: []
      });
      const novaTrilha = trilhaResp.data;
      // Vincula cursos selecionados
      for (let i = 0; i < selectedCursos.length; i++) {
        const id_curso = selectedCursos[i];
        await axios.post(`${API}/curso_trilha`, {
          id_curso,
          id_trilha: novaTrilha.id_trilha,
          ordem: i + 1,
          obrigatorio: true
        });
      }
      toast.success('Trilha criada e cursos vinculados!');
      setDialogOpen(false);
      fetchTrilhas();
      resetForm();
      setSelectedCursos([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar trilha ou vincular cursos');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente deletar esta trilha?')) return;
    
    try {
      await axios.delete(`${API}/trilhas/${id}`);
      toast.success('Trilha deletada com sucesso!');
      fetchTrilhas();
    } catch (error) {
      toast.error('Erro ao deletar trilha');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: ''
    });
    setSelectedCursos([]);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Trilhas de Aprendizagem</h1>
            <p className="text-gray-600">Organize cursos em trilhas de desenvolvimento</p>
          </div>
          {canManageTrilhas && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg"
                  data-testid="create-trilha-button"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nova Trilha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Trilha</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                    data-testid="trilha-titulo-input"
                  />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={4}
                    data-testid="trilha-descricao-input"
                  />
                </div>


                <div>
                  <Label className="mb-1 block">Vincular a Cursos</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                    {cursos.map((curso) => (
                      <label key={curso.id_curso} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCursos.includes(curso.id_curso)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCursos([...selectedCursos, curso.id_curso]);
                            } else {
                              setSelectedCursos(selectedCursos.filter(id => id !== curso.id_curso));
                            }
                          }}
                        />
                        <span>{curso.titulo}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" data-testid="trilha-submit-button" disabled={submitting}>
                    {submitting ? 'Criando...' : 'Criar Trilha'}
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

        {trilhas.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Route className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma trilha cadastrada</h3>
              <p className="text-gray-600">Comece criando sua primeira trilha de aprendizagem</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trilhas.map((trilha) => (
              <Card key={trilha.id_trilha} className="card-hover border-0 shadow-lg" data-testid={`trilha-card-${trilha.id_trilha}`}>
                <CardHeader>
                  <CardTitle className="text-xl">{trilha.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {trilha.descricao || 'Sem descrição'}
                  </p>

                  {canManageTrilhas && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(trilha.id_trilha)}
                      className="w-full text-red-600 hover:bg-red-50"
                      data-testid={`delete-trilha-${trilha.id_trilha}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar Trilha
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
