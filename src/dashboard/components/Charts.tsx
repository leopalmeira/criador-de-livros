import React, { useState } from 'react';
import { Observation, SalesCalibrationPoint } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface BsrChartProps {
  observations: Observation[];
  height?: number;
  width?: number;
}

export const BsrHistoryChart: React.FC<BsrChartProps> = ({ observations, height = 240, width = 760 }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; obs: Observation } | null>(null);

  const valid = observations
    .filter(o => o.bsr && o.bsr > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (valid.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b96ad', fontSize: '13px' }}>
        Histórico insuficiente para gerar o gráfico temporal (necessário pelo menos 2 observações registradas).
      </div>
    );
  }

  const padding = 40;
  const bsrValues = valid.map(o => o.bsr as number);
  const minBsr = Math.min(...bsrValues);
  const maxBsr = Math.max(...bsrValues);
  const minTime = valid[0].timestamp;
  const maxTime = valid[valid.length - 1].timestamp;
  const timeDiff = Math.max(1, maxTime - minTime);

  // EIXO Y INVERTIDO: BSR menor no topo (y menor = posição melhor!)
  const getY = (bsr: number) => {
    if (maxBsr === minBsr) return height / 2;
    return padding + ((bsr - minBsr) / (maxBsr - minBsr)) * (height - padding * 2);
  };

  const getX = (time: number) => {
    return padding + ((time - minTime) / timeDiff) * (width - padding * 2);
  };

  const pointsStr = valid.map(o => `${getX(o.timestamp)},${getY(o.bsr as number)}`).join(' ');

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Linhas de Grade */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1f2633" strokeDasharray="3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1f2633" strokeDasharray="3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1f2633" strokeDasharray="3" />

        {/* Labels do Eixo Y Invertido */}
        <text x={padding} y={padding - 10} fill="#10b981" fontSize="11" fontWeight="700">
          ▲ Topo: #{formatNumber(minBsr)}
        </text>
        <text x={padding} y={height - padding + 18} fill="#ef4444" fontSize="11" fontWeight="700">
          ▼ Fundo: #{formatNumber(maxBsr)}
        </text>

        {/* Linha do BSR */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />

        {/* Pontos clicáveis / hover */}
        {valid.map((obs, idx) => {
          const cx = getX(obs.timestamp);
          const cy = getY(obs.bsr as number);
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={hoveredPoint?.obs === obs ? 6 : 4}
              fill="#60a5fa"
              stroke="#0b0e14"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r 0.15s' }}
              onMouseEnter={() => setHoveredPoint({ x: cx, y: cy, obs })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip Hover */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#1a1e28',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#fff',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
            zIndex: 10
          }}
        >
          <div><strong>BSR: #{formatNumber(hoveredPoint.obs.bsr)}</strong></div>
          <div style={{ color: '#34d399' }}>Vendas Est: ≈ {hoveredPoint.obs.estimatedDailySales || 'N/D'}/dia</div>
          <div style={{ color: '#8b96ad', fontSize: '10px' }}>
            {new Date(hoveredPoint.obs.timestamp).toLocaleString('pt-BR')}
          </div>
        </div>
      )}
    </div>
  );
};

interface CalibrationChartProps {
  points: SalesCalibrationPoint[];
  height?: number;
  width?: number;
}

export const CalibrationCurveChart: React.FC<CalibrationChartProps> = ({ points, height = 200, width = 600 }) => {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.bsr - b.bsr);
  const padding = 35;

  const minBsr = Math.log(Math.max(1, sorted[0].bsr));
  const maxBsr = Math.log(sorted[sorted.length - 1].bsr);
  const minSales = Math.log(Math.max(0.01, sorted[sorted.length - 1].dailySales));
  const maxSales = Math.log(sorted[0].dailySales);

  const getX = (bsr: number) => {
    const lnB = Math.log(Math.max(1, bsr));
    return padding + ((lnB - minBsr) / (maxBsr - minBsr || 1)) * (width - padding * 2);
  };

  const getY = (sales: number) => {
    const lnS = Math.log(Math.max(0.01, sales));
    return height - padding - ((lnS - minSales) / (maxSales - minSales || 1)) * (height - padding * 2);
  };

  const linePoints = sorted.map(p => `${getX(p.bsr)},${getY(p.dailySales)}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: '#10131a', borderRadius: '8px', padding: '10px' }}>
      <div style={{ fontSize: '11px', color: '#8b96ad', marginBottom: '8px', fontWeight: 600 }}>
        Visualização da Curva de Vendas (Escala Logarítmica BSR vs Vendas/Dia)
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#2a3447" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2a3447" />

        <polyline
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          points={linePoints}
        />

        {sorted.map((p, idx) => (
          <circle
            key={idx}
            cx={getX(p.bsr)}
            cy={getY(p.dailySales)}
            r="4"
            fill="#a78bfa"
            stroke="#10131a"
            strokeWidth="1.5"
          />
        ))}

        <text x={padding} y={padding - 6} fill="#a78bfa" fontSize="10">Vendas: {sorted[0].dailySales}/dia</text>
        <text x={width - padding} y={height - padding + 16} fill="#8b96ad" fontSize="10" textAnchor="end">
          BSR: #{formatNumber(sorted[sorted.length - 1].bsr)}
        </text>
      </svg>
    </div>
  );
};
