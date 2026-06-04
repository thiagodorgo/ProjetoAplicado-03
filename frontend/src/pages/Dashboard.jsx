import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  ListChecks,
  Percent,
  Route,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { isAdmin, isAuditor, isColaborador } from '@/utils/auth';

const STATUS_ITEMS = [
  { key: 'pendente', label: 'Pendente', color: 'bg-orange-500' },
  { key: 'em_andamento', label: 'Em andamento', color: 'bg-blue-500' },
  { key: 'concluido', label: 'Concluído', color: 'bg-green-500' },
  { key: 'vencido', label: 'Vencido', color: 'bg-red-500' },
  { key: 'cancelado', label: 'Cancelado', color: 'bg-slate-500' },
];

const COURSE_TYPE_LABELS = {
  nr31: 'NR-31',
  operacao_maquinas: 'Operação de máquinas',
  agrotoxicos: 'Agrotóxicos',
  primeiros_socorros: 'Primeiros socorros',
  prevencao_acidentes: 'Prevenção de acidentes',
  outros: 'Outros',
};

const RESOURCE_LABELS = {
  stats: 'indicadores gerais',
  cursos: 'cursos',
  trilhas: 'trilhas',
  inscricoes: 'inscrições',
  regras: 'regras obrigatórias',
  colaboradores: 'colaboradores',
  certificados: 'certificados',
};

const emptyData = {
  stats: null,
  cursos: [],
  trilhas: [],
  inscricoes: [],
  regras: [],
  colaboradores: [],
  certificados: [],
};

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || 'outros';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function countStatuses(inscricoes) {
  return STATUS_ITEMS.reduce((acc, status) => {
    acc[status.key] = inscricoes.filter(inscricao => inscricao.status === status.key).length;
    return acc;
  }, {});
}

function calculateCompletion(concluidas, total) {
  if (!total) {
    return 0;
  }

  return Number(((concluidas / total) * 100).toFixed(1));
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getCourseById(cursos) {
  return cursos.reduce((acc, curso) => {
    acc[Number(curso.id_curso)] = curso;
    return acc;
  }, {});
}

function MetricCard({ title, value, icon: Icon, color, testId }) {
  return (
    <Card className="card-hover border-0 shadow-lg overflow-hidden" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 break-words">{value}</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarList({ title, icon: Icon, items }) {
  const maxValue = Math.max(...items.map(item => item.value), 1);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => {
          const width = item.value > 0 ? Math.max((item.value / maxValue) * 100, 8) : 0;

          return (
            <div key={item.key || item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="text-gray-600">{item.value}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color || 'bg-blue-500'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ComplianceDonut({ title, completed, pending }) {
  const total = completed + pending;
  const percentage = calculateCompletion(completed, total);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div
            className="w-40 h-40 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(#10b981 0 ${percentage}%, #f97316 ${percentage}% 100%)`,
            }}
          >
            <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
              <span className="text-xs text-gray-500">conclusão</span>
            </div>
          </div>
          <div className="space-y-3 w-full">
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
              <span className="text-sm font-medium text-green-800">Concluídos</span>
              <span className="font-bold text-green-900">{completed}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3">
              <span className="text-sm font-medium text-orange-800">Não concluídos</span>
              <span className="font-bold text-orange-900">{pending}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressPanel({ percentage }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Progresso geral dos seus treinamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Percentual de conclusão pessoal</span>
          <span className="text-lg font-bold text-gray-900">{percentage}%</span>
        </div>
        <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-500" style={{ width: `${percentage}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function ActionLink({ href, icon: Icon, title, description, className, iconClass }) {
  return (
    <Link to={href} className={`p-6 bg-gradient-to-br ${className} rounded-xl hover:shadow-lg transition-all duration-200 group`}>
      <Icon className={`w-8 h-8 ${iconClass} mb-3 group-hover:scale-110 transition-transform`} />
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(emptyData);
  const [failedResources, setFailedResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user?.id_colaborador, user?.id_perfil]);

  const loadDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailedResources([]);

    const requests = {
      cursos: axios.get(`${API}/cursos`),
      trilhas: axios.get(`${API}/trilhas`),
      inscricoes: axios.get(`${API}/inscricoes`),
    };

    if (isAdmin(user)) {
      requests.stats = axios.get(`${API}/dashboard/stats`);
      requests.regras = axios.get(`${API}/regras-obrigatorias`);
      requests.colaboradores = axios.get(`${API}/colaboradores`);
    }

    if (isAuditor(user)) {
      requests.stats = axios.get(`${API}/dashboard/stats`);
      requests.regras = axios.get(`${API}/regras-obrigatorias`);
      requests.certificados = axios.get(`${API}/certificados`);
    }

    const entries = Object.entries(requests);
    const results = await Promise.allSettled(entries.map(async ([key, request]) => {
      const response = await request;
      return [key, response.data];
    }));

    const nextData = { ...emptyData };
    const nextFailures = [];

    results.forEach((result, index) => {
      const key = entries[index][0];

      if (result.status === 'rejected') {
        nextFailures.push(key);
        return;
      }

      const [, value] = result.value;
      nextData[key] = key === 'stats' ? value : normalizeList(value);
    });

    setDashboardData(nextData);
    setFailedResources(nextFailures);
    setLoading(false);
  };

  const derived = useMemo(() => {
    const { stats, cursos, trilhas, inscricoes, regras, colaboradores, certificados } = dashboardData;
    const allStatusCounts = countStatuses(inscricoes);
    const userInscricoes = inscricoes.filter(inscricao => Number(inscricao.id_colaborador) === Number(user?.id_colaborador));
    const userStatusCounts = countStatuses(userInscricoes);
    const cursosById = getCourseById(cursos);
    const enrolledCourseIds = new Set(userInscricoes.map(inscricao => Number(inscricao.id_curso)));
    const totalInscricoes = stats?.total_inscricoes ?? inscricoes.length;
    const inscricoesConcluidas = stats?.inscricoes_concluidas ?? allStatusCounts.concluido ?? 0;
    const inscricoesPendentes = stats?.inscricoes_pendentes ?? allStatusCounts.pendente ?? 0;
    const nonCompleted = Math.max(totalInscricoes - inscricoesConcluidas, 0);
    const taxaConclusao = stats?.taxa_conclusao ?? calculateCompletion(inscricoesConcluidas, totalInscricoes);
    const certificadosVencidos = stats?.certificados_vencidos ?? certificados.filter(certificado => certificado.status === 'vencido').length;

    const userTotal = userInscricoes.length;
    const userConcluidos = userStatusCounts.concluido || 0;
    const userPercentual = calculateCompletion(userConcluidos, userTotal);
    const priorityOrder = { pendente: 1, em_andamento: 2, vencido: 3, cancelado: 4, concluido: 5 };
    const userTrainings = userInscricoes.map(inscricao => ({
      ...inscricao,
      curso: cursosById[Number(inscricao.id_curso)],
    }));
    const priorityTrainings = userTrainings
      .filter(item => ['pendente', 'em_andamento'].includes(item.status))
      .sort((a, b) => (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99))
      .slice(0, 3);
    const completedTrainings = userTrainings
      .filter(item => item.status === 'concluido')
      .slice(0, 3);

    const recommendationScore = (curso) => {
      const title = `${curso.titulo || ''} ${curso.tipo_treinamento || ''}`.toLowerCase();
      if (curso.tipo_treinamento === 'nr31' || title.includes('nr-31')) return 1;
      if (title.includes('segurança') || title.includes('seguranca')) return 2;
      if (curso.tipo_treinamento === 'prevencao_acidentes' || title.includes('prevenção')) return 3;
      if (curso.tipo_treinamento === 'agrotoxicos' || title.includes('agrotóxico') || title.includes('epi')) return 4;
      if (curso.tipo_treinamento === 'operacao_maquinas') return 5;
      return 9;
    };

    const recommendedCourses = cursos
      .filter(curso => !enrolledCourseIds.has(Number(curso.id_curso)))
      .sort((a, b) => recommendationScore(a) - recommendationScore(b))
      .slice(0, 3);

    const typeCounts = countBy(cursos, curso => curso.tipo_treinamento || 'outros');
    const mandatoryTracks = trilhas.filter(trilha => trilha.obrigatoria).length;

    return {
      allStatusCounts,
      userStatusCounts,
      userInscricoes,
      priorityTrainings,
      completedTrainings,
      recommendedCourses,
      totalInscricoes,
      inscricoesConcluidas,
      inscricoesPendentes,
      nonCompleted,
      taxaConclusao,
      certificadosVencidos,
      userTotal,
      userPercentual,
      typeCounts,
      mandatoryTracks,
      optionalTracks: Math.max(trilhas.length - mandatoryTracks, 0),
      totalColaboradores: stats?.total_colaboradores ?? colaboradores.length,
      totalCursos: stats?.total_cursos ?? cursos.length,
      totalRegras: regras.length,
    };
  }, [dashboardData, user]);

  const errorMessage = failedResources.length > 0
    ? `Não foi possível carregar todos os indicadores no momento. Dados afetados: ${failedResources.map(key => RESOURCE_LABELS[key]).join(', ')}.`
    : null;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    );
  }

  const renderError = () => errorMessage && (
    <Card className="border border-orange-200 shadow-sm bg-orange-50">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-orange-900">{errorMessage}</p>
      </CardContent>
    </Card>
  );

  const renderAdminDashboard = () => {
    const statusBars = STATUS_ITEMS.map(status => ({
      ...status,
      value: derived.allStatusCounts[status.key] || 0,
    }));
    const courseTypeBars = Object.entries(COURSE_TYPE_LABELS).map(([key, label]) => ({
      key,
      label,
      value: derived.typeCounts[key] || 0,
      color: 'bg-indigo-500',
    }));

    const cards = [
      { title: 'Total de Cursos', value: derived.totalCursos, icon: BookOpen, color: 'from-blue-500 to-blue-600', testId: 'total-cursos' },
      { title: 'Colaboradores', value: derived.totalColaboradores, icon: Users, color: 'from-green-500 to-green-600', testId: 'total-colaboradores' },
      { title: 'Total de Inscrições', value: derived.totalInscricoes, icon: ListChecks, color: 'from-indigo-500 to-indigo-600', testId: 'total-inscricoes' },
      { title: 'Inscrições Concluídas', value: derived.inscricoesConcluidas, icon: ClipboardCheck, color: 'from-teal-500 to-teal-600', testId: 'inscricoes-concluidas' },
      { title: 'Inscrições Pendentes', value: derived.inscricoesPendentes, icon: Clock, color: 'from-orange-500 to-orange-600', testId: 'inscricoes-pendentes' },
      { title: 'Taxa de Conclusão', value: `${derived.taxaConclusao}%`, icon: Percent, color: 'from-emerald-500 to-emerald-600', testId: 'taxa-conclusao' },
      { title: 'Total de Trilhas', value: dashboardData.trilhas.length, icon: Route, color: 'from-purple-500 to-purple-600', testId: 'total-trilhas' },
      { title: 'Regras Obrigatórias', value: derived.totalRegras, icon: ShieldCheck, color: 'from-slate-500 to-slate-600', testId: 'total-regras' },
    ];

    return (
      <>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Visão gerencial do sistema de treinamentos obrigatórios.</p>
        </div>

        {renderError()}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {cards.map(card => <MetricCard key={card.title} {...card} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BarList title="Inscrições por status" icon={BarChart3} items={statusBars} />
          <ComplianceDonut title="Conformidade dos treinamentos" completed={derived.inscricoesConcluidas} pending={derived.nonCompleted} />
          <BarList title="Cursos por tipo de treinamento" icon={BookOpen} items={courseTypeBars} />
          <BarList
            title="Trilhas obrigatórias"
            icon={Route}
            items={[
              { key: 'obrigatorias', label: 'Obrigatórias', value: derived.mandatoryTracks, color: 'bg-purple-500' },
              { key: 'nao-obrigatorias', label: 'Não obrigatórias', value: derived.optionalTracks, color: 'bg-slate-400' },
            ]}
          />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionLink href="/cursos" icon={BookOpen} title="Gerenciar Cursos" description="Criar e editar cursos do sistema" className="from-blue-50 to-blue-100" iconClass="text-blue-600" />
              <ActionLink href="/colaboradores" icon={Users} title="Gerenciar Colaboradores" description="Visualizar colaboradores cadastrados" className="from-green-50 to-green-100" iconClass="text-green-600" />
              <ActionLink href="/regras" icon={ClipboardCheck} title="Regras Obrigatórias" description="Configurar treinamentos obrigatórios" className="from-teal-50 to-teal-100" iconClass="text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderColaboradorDashboard = () => {
    const cards = [
      { title: 'Cursos vinculados', value: derived.userTotal, icon: GraduationCap, color: 'from-blue-500 to-blue-600' },
      { title: 'Pendentes', value: derived.userStatusCounts.pendente || 0, icon: Clock, color: 'from-orange-500 to-orange-600' },
      { title: 'Em andamento', value: derived.userStatusCounts.em_andamento || 0, icon: TrendingUp, color: 'from-indigo-500 to-indigo-600' },
      { title: 'Concluídos', value: derived.userStatusCounts.concluido || 0, icon: CheckCircle2, color: 'from-green-500 to-green-600' },
      { title: 'Conclusão pessoal', value: `${derived.userPercentual}%`, icon: Percent, color: 'from-teal-500 to-teal-600' },
    ];

    return (
      <>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Olá, {user?.nome}.</h1>
          <p className="text-gray-600">Acompanhe seus treinamentos obrigatórios.</p>
        </div>

        {renderError()}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {cards.map(card => <MetricCard key={card.title} {...card} />)}
        </div>

        <ProgressPanel percentage={derived.userPercentual} />

        {derived.userTotal === 0 && (
          <Card className="border-0 shadow-lg bg-blue-50">
            <CardContent className="p-6">
              <p className="text-blue-900 font-medium">Você ainda não possui treinamentos vinculados.</p>
              <p className="text-sm text-blue-800 mt-1">Acesse o catálogo de cursos ou aguarde a vinculação pelo RH.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <TrainingList title="Meus treinamentos prioritários" items={derived.priorityTrainings} emptyText="Nenhuma pendência no momento." />
          <TrainingList title="Cursos concluídos recentemente" items={derived.completedTrainings} emptyText="Nenhum curso concluído ainda." />
          <CourseRecommendationList courses={derived.recommendedCourses} />
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionLink href="/meus-cursos" icon={GraduationCap} title="Ver meus cursos" description="Acompanhar inscrições e progresso" className="from-green-50 to-green-100" iconClass="text-green-600" />
              <ActionLink href="/cursos" icon={BookOpen} title="Explorar cursos" description="Consultar o catálogo de treinamentos" className="from-blue-50 to-blue-100" iconClass="text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderAuditorDashboard = () => {
    const statusBars = ['pendente', 'em_andamento', 'vencido', 'cancelado'].map(key => {
      const item = STATUS_ITEMS.find(status => status.key === key);
      return { ...item, value: derived.allStatusCounts[key] || 0 };
    });
    const attentionPoints = [
      { label: 'Inscrições pendentes', value: derived.inscricoesPendentes },
      { label: 'Certificados vencidos', value: derived.certificadosVencidos },
      { label: 'Regras obrigatórias cadastradas', value: derived.totalRegras },
      { label: 'Cursos obrigatórios cadastrados', value: dashboardData.cursos.filter(curso => curso.tipo_treinamento === 'nr31').length },
    ];

    const cards = [
      { title: 'Taxa geral de conclusão', value: `${derived.taxaConclusao}%`, icon: Percent, color: 'from-emerald-500 to-emerald-600' },
      { title: 'Inscrições concluídas', value: derived.inscricoesConcluidas, icon: ClipboardCheck, color: 'from-green-500 to-green-600' },
      { title: 'Inscrições pendentes', value: derived.inscricoesPendentes, icon: Clock, color: 'from-orange-500 to-orange-600' },
      { title: 'Certificados vencidos', value: derived.certificadosVencidos, icon: Award, color: 'from-red-500 to-red-600' },
      { title: 'Regras obrigatórias', value: derived.totalRegras, icon: ShieldCheck, color: 'from-slate-500 to-slate-600' },
    ];

    return (
      <>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard de Conformidade</h1>
          <p className="text-gray-600">Visão de auditoria dos treinamentos obrigatórios.</p>
        </div>

        {renderError()}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {cards.map(card => <MetricCard key={card.title} {...card} />)}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ComplianceDonut title="Conformidade geral" completed={derived.inscricoesConcluidas} pending={derived.nonCompleted} />
          <BarList title="Pendências por status" icon={AlertTriangle} items={statusBars} />
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Pontos de atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {attentionPoints.map(point => (
                <div key={point.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">{point.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{point.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionLink href="/relatorios" icon={BarChart3} title="Ver relatórios" description="Consultar indicadores detalhados" className="from-teal-50 to-teal-100" iconClass="text-teal-600" />
              <ActionLink href="/cursos" icon={BookOpen} title="Consultar cursos" description="Ver catálogo de treinamentos" className="from-blue-50 to-blue-100" iconClass="text-blue-600" />
              <ActionLink href="/trilhas" icon={Route} title="Consultar trilhas" description="Ver trilhas de aprendizagem" className="from-purple-50 to-purple-100" iconClass="text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {isAdmin(user) && renderAdminDashboard()}
        {isColaborador(user) && renderColaboradorDashboard()}
        {isAuditor(user) && renderAuditorDashboard()}
        {!isAdmin(user) && !isColaborador(user) && !isAuditor(user) && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <p className="text-gray-700">Perfil não identificado. Entre novamente ou procure o administrador do sistema.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function TrainingList({ title, items, emptyText }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyText}</p>
        ) : (
          items.map(item => (
            <div key={item.id_inscricao} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">{item.curso?.titulo || `Curso ${item.id_curso}`}</p>
              <p className="text-sm text-gray-600 mt-1">Status: {formatValue(item.status)}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CourseRecommendationList({ courses }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Cursos recomendados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.length === 0 ? (
          <p className="text-sm text-gray-500">Não há recomendações disponíveis no momento.</p>
        ) : (
          courses.map(curso => (
            <Link key={curso.id_curso} to={`/cursos/${curso.id_curso}`} className="block rounded-xl border border-gray-100 bg-blue-50 p-4 hover:shadow-md transition-shadow">
              <p className="font-semibold text-gray-900">{curso.titulo}</p>
              <p className="text-sm text-blue-800 mt-1">{COURSE_TYPE_LABELS[curso.tipo_treinamento] || formatValue(curso.tipo_treinamento)}</p>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
