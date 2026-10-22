import React from 'react';
import { ArrowUpRight, ArrowDownRight, Server, History } from 'lucide-react';

interface DashboardProps {
  totalDiaAtual: number;
  totalDiaAnterior: number;
  totalEntraram: number;
  totalSairam: number;
  id: string;
}

export default function Dashboard({
  totalDiaAtual,
  totalDiaAnterior,
  totalEntraram,
  totalSairam,
  id,
}: DashboardProps) {
  const cards = [
    {
      id: `${id}-card-atual`,
      title: 'Ativos Dia Atual',
      value: totalDiaAtual,
      sub: 'Planilha mais recente carregada',
      icon: Server,
      color: 'text-blue-600 bg-blue-50/70 border-blue-100/80',
      accent: 'bg-blue-600',
    },
    {
      id: `${id}-card-anterior`,
      title: 'Ativos Dia Anterior',
      value: totalDiaAnterior,
      sub: 'Planilha de referência anterior',
      icon: History,
      color: 'text-slate-600 bg-slate-100/70 border-slate-200/80',
      accent: 'bg-slate-500',
    },
    {
      id: `${id}-card-entraram`,
      title: 'Ativos que Entraram',
      value: totalEntraram,
      sub: 'Novos ativos identificados na rede',
      icon: ArrowUpRight,
      color: 'text-emerald-600 bg-emerald-50/70 border-emerald-100/80',
      accent: 'bg-emerald-500',
    },
    {
      id: `${id}-card-sairam`,
      title: 'Ativos que Saíram',
      value: totalSairam,
      sub: 'Ativos não encontrados na última varredura',
      icon: ArrowDownRight,
      color: 'text-rose-600 bg-rose-50/70 border-rose-100/80',
      accent: 'bg-rose-500',
    },
  ];

  return (
    <div id={`${id}-grid`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            id={card.id}
            key={card.id}
            className="group relative flex flex-col justify-between p-6 rounded-[16px] border border-slate-200/60 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            {/* Top tiny accent bar matching the metric type */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${card.accent} opacity-80`} />
            
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  {card.title}
                </span>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans transition-all group-hover:text-black">
                    {card.value}
                  </span>
                </div>
              </div>
              
              <div className={`p-3 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-110 ${card.color}`}>
                <Icon className="h-6 w-6 stroke-[2]" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {card.sub}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors duration-300"></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
