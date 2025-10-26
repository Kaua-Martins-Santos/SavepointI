import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; 

const RankingList = ({ title, data, dataKey, unit }) => (
  <div>
    {/* Aplica o estilo de título de seção do App.css */}
    <h4 style={{ fontFamily: 'Cinzel, serif', color: 'var(--cor-destaque-primario)', borderBottom: '1px solid var(--cor-destaque-primario)', paddingBottom: '5px' }}>{title}</h4>
    <ol className="ranking-list" style={{ listStyle: 'none', padding: 0 }}>
      {Array.isArray(data) && data.map((item, index) => (
        <li key={index} style={{ padding: '8px 0', borderBottom: '1px dotted #555', display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
          <span className="ranking-name" style={{ fontWeight: 'bold' }}>{index + 1}. {item.nome || item.nome_cla}</span>
          <span className="ranking-score" style={{ color: 'var(--cor-destaque-primario)' }}>{item[dataKey]} {unit}</span>
        </li>
      ))}
    </ol>
  </div>
);

function Admin() {
  const [rankingIndividual, setRankingIndividual] = useState([]);
  const [rankingClas, setRankingClas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRankInd, resRankClas] = await Promise.all([
          axios.get('http://localhost:3001/relatorios/ranking/individual'),
          axios.get('http://localhost:3001/relatorios/ranking/clas')
        ]);

        setRankingIndividual(resRankInd.data);
        setRankingClas(resRankClas.data);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        setRankingIndividual([]);
        setRankingClas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="container"><h1>Carregando Tomos Secretos...</h1></div>;

  return (
    <div className="container">
      <header><h1>Painel do Mestre do Jogo</h1></header>
      
      <section className="card">
        <h2>Mapa de Poder e Riqueza</h2>
        <div className="rankings-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <RankingList title="Top 10 Aventureiros (Ouro)" data={rankingIndividual} dataKey="score" unit="ouro" />
          <RankingList title="Top 10 Guildas (Fortuna)" data={rankingClas} dataKey="score" unit="ouro" />
        </div>
      </section>
      
      {/* Removemos a seção de Frequência conforme o backend não a suporta mais */}
    </div>
  );
}

export default Admin;