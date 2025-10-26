import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Ranking.css'; // Criaremos este arquivo de estilo a seguir

// Componente para um único item do ranking, com medalhas para o top 3
const RankingItem = ({ item, index, dataKey, unit }) => {
    const getMedal = (index) => {
        if (index === 0) return '🥇'; // Ouro
        if (index === 1) return '🥈'; // Prata
        if (index === 2) return '🥉'; // Bronze
        return <span className="rank-number">{index + 1}</span>;
    };

    return (
        <li>
            <div className="rank-position">{getMedal(index)}</div>
            <div className="rank-name">{item.nome || item.nome_cla}</div>
            <div className="rank-score">
                {item[dataKey]} <span className="score-unit">{unit}</span>
            </div>
        </li>
    );
};

function Ranking() {
    const [rankingIndividual, setRankingIndividual] = useState([]);
    const [rankingClas, setRankingClas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const [resInd, resClas] = await Promise.all([
                    axios.get('http://localhost:3001/relatorios/ranking/individual'),
                    axios.get('http://localhost:3001/relatorios/ranking/clas')
                ]);
                setRankingIndividual(resInd.data);
                setRankingClas(resClas.data);
            } catch (err) {
                setError('A Forja está fria... Não foi possível carregar os dados do Salão das Lendas. Verifique o console do Dragão (F12).');
                console.error("Erro ao buscar rankings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, []);

    if (loading) {
        return <div className="ranking-container loading"><h1>Forjando as Lendas...</h1></div>;
    }
    
    if (error) {
        return <div className="ranking-container error"><h1>{error}</h1></div>;
    }

    return (
        <div className="ranking-container">
            <header className="ranking-header">
                <h1>Salão das Lendas da Save Point</h1>
                <p>Onde os feitos dos maiores aventureiros são eternizados.</p>
            </header>

            <main className="rankings-grid">
                <section className="ranking-card parchment">
                    <h2 className="ranking-title">Heróis Lendários</h2>
                    <ol>
                        {rankingIndividual.map((item, index) => (
                            <RankingItem key={index} item={item} index={index} dataKey="score" unit="de Ouro" />
                        ))}
                    </ol>
                </section>

                <section className="ranking-card parchment">
                    <h2 className="ranking-title">Clãs Renomados</h2>
                    <ol>
                        {rankingClas.map((item, index) => (
                            <RankingItem key={index} item={item} index={index} dataKey="score" unit="de Ouro" />
                        ))}
                    </ol>
                </section>
            </main>
        </div>
    );
}

export default Ranking;