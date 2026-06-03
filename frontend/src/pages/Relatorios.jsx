import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { API } from '@/App';
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  ListChecks,
  Percent,
  Route,
  ShieldCheck,
  Users,
} from 'lucide-react';

const STATUS_INSCRICAO = [
  { key: 'pendente', label: 'Pendente' },
  { key: 'em_andamento', label: 'Em andamento' },
  { key: 'concluido', label: 'Concluído' },
  { key: 'vencido', label: 'Vencido' },
  { key: 'cancelado', label: 'Cancelado' },
];

const endpointLabels = {
  stats: 'indicadores do dashboard',
  cursos: 'cursos',
  trilhas: 'trilhas',
  regras: 'regras obrigatórias',
  inscricoes: 'inscrições',
};

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

export default function Relatorios() {
  const [stats, setStats] = useState(null);
  const [cursos, setCursos] = useState([]);
  const [trilhas, setTrilhas] = useState([]);
  const [regras, setRegras] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatorios();
  }, []);

  const fetchRelatorios = async () => {
    setLoading(true);

    const requests = {
      stats: axios.get(`${API}/dashboard/stats`),
      cursos: axios.get(`${API}/cursos`),
      trilhas: axios.get(`${API}/trilhas`),
      regras: axios.get(`${API}/regras-obrigatorias`),
      inscricoes: axios.get(`${API}/inscricoes`),
    };

    const results = await Promise.allSettled(Object.entries(requests).map(async ([key, request]) => {
      const response = await request;
      return [key, response.data];
    }));

    const nextErrors = [];

    results.forEach(result => {
      if (result.status === 'rejected') {
        nextErrors.push(result.reason?.config?.url || 'endpoint não identificado');
        return;
      }

      const [key, data] = result.value;

      if (key === 'stats') {
        setStats(data || null);
      }

      if (key === 'cursos') {
        setCursos(normalizeList(data));
      }

      if (key === 'trilhas') {
        setTrilhas(normalizeList(data));
      }

      if (key === 'regras') {
        setRegras(normalizeList(data));
      }

      if (key === 'inscricoes') {
        setInscricoes(normalizeList(data));
      }
    });

    setErrors(nextErrors);
    setLoading(false);
  };

  const statusCounts = useMemo(() => {
    return STATUS_INSCRICAO.reduce((acc, status) => {
      acc[status.key] = inscricoes.filter(inscricao => inscricao.status === status.key).length;
      return acc;
    }, {});
  }, [inscricoes]);

  const totalInscricoes = stats?.total_inscricoes ?? inscricoes.length;
  const inscricoesConcluidas = stats?.inscricoes_concluidas ?? statusCounts.concluido ?? 0;
  const inscricoesPendentes = stats?.inscricoes_pendentes ?? statusCounts.pendente ?? 0;
  const taxaConclusao = stats?.taxa_conclusao ?? (
    totalInscricoes > 0 ? Number(((inscricoesConcluidas / totalInscricoes) * 100).toFixed(2)) : 0
  );

  const metricCards = [
    {
      title: 'Total de cursos',
      value: stats?.total_cursos ?? cursos.length,
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Total de colaboradores',
      value: stats?.total_colaboradores ?? 0,
      icon: Users,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Total de inscrições',
      value: totalInscricoes,
      icon: ListChecks,
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Inscrições concluídas',
      value: inscricoesConcluidas,
      icon: ClipboardCheck,
      color: 'from-teal-500 to-teal-600',
    },
    {
      title: 'Inscrições pendentes',
      value: inscricoesPendentes,
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Taxa de conclusão',
      value: `${taxaConclusao}%`,
      icon: Percent,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Total de trilhas',
      value: trilhas.length,
      icon: Route,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Regras obrigatórias',
      value: regras.length,
      icon: ShieldCheck,
      color: 'from-slate-500 to-slate-600',
    },
  ];

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
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Relatórios</h1>
          <p className="text-gray-600">Indicadores reais de conformidade e cadastros do MVP</p>
        </div>

        {errors.length > 0 && (
          <Card className="border border-orange-200 shadow-sm bg-orange-50">
            <CardContent className="p-5">
              <p className="font-medium text-orange-900">Alguns dados não puderam ser carregados.</p>
              <p className="text-sm text-orange-800 mt-1">
                Verifique a conexão com a API e tente novamente. Endpoints afetados: {errors.map(error => {
                  const entry = Object.entries(endpointLabels).find(([key]) => error.includes(key));
                  return entry ? entry[1] : error;
                }).join(', ')}.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {metricCards.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card key={metric.title} className="card-hover border-0 shadow-lg overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Inscrições por status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_INSCRICAO.map(status => (
                    <tr key={status.key} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-900">{status.label}</td>
                      <td className="px-4 py-3 text-gray-700">{statusCounts[status.key] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Cursos cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {cursos.length === 0 ? (
              <div className="text-gray-500">Nenhum curso cadastrado ou disponível para exibição.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Título</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Modalidade</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Carga horária</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Norma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.map(curso => (
                      <tr key={curso.id_curso} className="border-b last:border-0">
                        <td className="px-4 py-3 text-gray-900">{curso.titulo}</td>
                        <td className="px-4 py-3 text-gray-700">{formatValue(curso.modalidade)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatValue(curso.tipo_treinamento)}</td>
                        <td className="px-4 py-3 text-gray-700">{curso.carga_horaria ? `${curso.carga_horaria}h` : '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatValue(curso.norma_referencia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Trilhas cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {trilhas.length === 0 ? (
              <div className="text-gray-500">Nenhuma trilha cadastrada ou disponível para exibição.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Título</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Descrição</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-700">Obrigatória</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trilhas.map(trilha => (
                      <tr key={trilha.id_trilha} className="border-b last:border-0">
                        <td className="px-4 py-3 text-gray-900">{trilha.titulo}</td>
                        <td className="px-4 py-3 text-gray-700">{trilha.descricao || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{trilha.obrigatoria ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
