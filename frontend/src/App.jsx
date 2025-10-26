import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const OPCOES_INTERESSES = [
  "Jogos de carta", "Jogos de tabuleiro", "RPG de mesa",
  "Jogos digitais", "Jogos de estratégia", "Jogos cooperativos"
];

const xpParaAlcancarnivel = (nivel) => {
    if (nivel <= 1) return 0;
    return 1000 * (nivel - 1) * 1.5;
}

// Componente: Notificação de Recompensa
const ToastRecompensa = ({ nome, nivel, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Exibe por 5 segundos

        return () => clearTimeout(timer);
    }, [onClose]);

    // O pop-up só será renderizado se tiver nome e nível, prevenindo a tela vazia.
    if (!nome || !nivel) return null; 

    return (
        <div className="toast-recompensa">
            <h3>NÍVEL ALCANÇADO! 🎉</h3>
            <p>Parabéns, {nome}!</p>
            <p className="premio-info">Você atingiu o **Nível {nivel}** e desbloqueou uma recompensa!</p>
            <p>Procure um monitor da Save Point para resgatar seu prêmio agora!</p>
        </div>
    );
};

function App() {
  const [passo, setPasso] = useState(1);
  const [telefone, setTelefone] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [usuario, setUsuario] = useState({});
  const [mensagemFinal, setMensagemFinal] = useState('');
  const [dadosJogador, setDadosJogador] = useState(null);
  const [showLevelUpToast, setShowLevelUpToast] = useState(false);
  
  const [formData, setFormData] = useState({ nomeCompleto: '', nickname: '' });
  const [interesses, setInteresses] = useState({});
  
  const [claMembros, setClaMembros] = useState([]);
  const [novoMembro, setNovoMembro] = useState({ nome: '', telefone: '' });
  const [membrosPresentes, setMembrosPresentes] = useState({});

  const handleTelefoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setTelefone(value);
  };

  const handleIdentificar = async (e) => {
    e.preventDefault();
    try {
        const { data } = await axios.post('http://localhost:3001/identificar', { telefone });
        setTipoUsuario(data.tipo);
        setUsuario(data);
        if (data.cla && data.cla.membros) {
            const presencasIniciais = { [data.nome]: true };
            data.cla.membros.forEach(m => {
                if (m.nome !== data.nome) {
                    presencasIniciais[m.nome] = false;
                }
            });
            setMembrosPresentes(presencasIniciais);
        }
        setPasso(2);
    } catch (error) {
        alert("Erro ao identificar usuário. Verifique se o backend está a correr e tente novamente.");
    }
  };

  const handleRegistrarVisita = async (e) => {
    e.preventDefault();
    const interessesSelecionados = Object.keys(interesses).filter(key => interesses[key]);

    const payload = {
      telefone,
      nomeCompleto: formData.nomeCompleto || usuario.nome,
      nickname: formData.nickname,
      interesses: interessesSelecionados,
      novoCla: claMembros && claMembros.length > 0 ? { membros: claMembros } : null,
      membrosPresentes: Object.keys(membrosPresentes).filter(key => membrosPresentes[key])
    };

    try {
      const { data } = await axios.post('http://localhost:3001/registrar-visita', payload);
      
      // *** AJUSTE CRÍTICO AQUI:
      // O nome do usuário pode vir do nickname ou nomeCompleto
      const nomeExibicao = data.nome || formData.nickname || formData.nomeCompleto; 

      setUsuario(prev => ({ ...prev, nome: nomeExibicao }));
      setMensagemFinal(data.mensagemGamificacao);
      setDadosJogador(data.jogador);
      setPasso(3);
      
      if (data.subiuDeNivel) {
          setShowLevelUpToast(true);
      }

    } catch (error) {
      alert("Ocorreu um erro ao registrar a visita.");
    }
  };

  const resetFlow = () => {
    setPasso(1);
    setTelefone('');
    setInteresses({});
    setClaMembros([]);
    setDadosJogador(null);
    setFormData({ nomeCompleto: '', nickname: '' });
    setShowLevelUpToast(false);
    setMembrosPresentes({});
  };

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleInteresseChange = (e) => {
    const { name, checked } = e.target;
    setInteresses(prev => ({ ...prev, [name]: checked }));
  };
  const handleMembroChange = (e) => setNovoMembro(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const addMembroCla = () => {
    if (novoMembro.nome && novoMembro.telefone) {
      setClaMembros([...claMembros, novoMembro]);
      setNovoMembro({ nome: '', telefone: '' });
    }
  };
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setMembrosPresentes(prev => ({ ...prev, [name]: checked }));
  };

  const renderizarProgresso = () => {
    if (!dadosJogador) return null;
    const xpInicioNivel = xpParaAlcancarnivel(dadosJogador.nivel);
    const xpParaProximoNivel = dadosJogador.xp_para_proximo_nivel;
    const xpTotalParaNivel = xpParaProximoNivel - xpInicioNivel;
    const xpGanhoNoNivel = dadosJogador.moedas_ouro - xpInicioNivel;
    const percentagem = xpTotalParaNivel > 0 ? (xpGanhoNoNivel / xpTotalParaNivel) * 100 : 0;

    return (
        <div className="progresso-container">
            <h3>Seu Progresso</h3>
            <p><strong>Nível:</strong> {dadosJogador.nivel}</p>
            <p><strong>Moedas de Ouro (Total):</strong> {dadosJogador.moedas_ouro}</p>
            <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${percentagem}%` }}></div>
            </div>
            <p className="xp-text">{xpGanhoNoNivel} / {xpTotalParaNivel} para o próximo nível</p>
        </div>
    );
  };
  
  const renderizarCriacaoCla = () => (
    <div className="cla-section">
      <h4>Registro de Guilda (Opcional)</h4>
      <div className="membros-list">{claMembros.map((m, i) => <div key={i} className="membro-tag">{m.nome}</div>)}</div>
      <input type="text" name="nome" placeholder="Nome do companheiro de aventura" value={novoMembro.nome} onChange={handleMembroChange} />
      <input type="tel" name="telefone" placeholder="Telefone do companheiro" value={novoMembro.telefone} onChange={(e) => setNovoMembro(prev => ({ ...prev, [e.target.name]: e.target.value.replace(/\D/g, '') }))} />
      <button type="button" onClick={addMembroCla}>Adicionar Membro</button>
    </div>
  );

  const renderizarSeletorCla = () => (
    <div className="cla-section">
      <h4>Companheiros Presentes da Guilda ({usuario.cla.nome_familia})</h4>
      {usuario.cla.membros.map(membro => (
        <div className="interesse-item" key={membro.telefone}>
          <input type="checkbox" id={membro.nome} name={membro.nome} checked={!!membrosPresentes[membro.nome]} onChange={handleCheckboxChange} />
          <label htmlFor={membro.nome}>{membro.nome}</label>
        </div>
      ))}
    </div>
  );

  const renderizarCheckinForm = () => (
    <form onSubmit={handleRegistrarVisita}>
        <h2>Início da Missão</h2>
        {tipoUsuario === 'novo_visitante' && <><label>Nome do Aventureiro</label><input type="text" name="nomeCompleto" value={formData.nomeCompleto} onChange={handleInputChange} required /></>}
        {(tipoUsuario === 'aluno' || tipoUsuario === 'visitante_existente') && <><label>Codinome (Nickname - Opcional)</label><input type="text" name="nickname" value={formData.nickname} onChange={handleInputChange} placeholder={usuario.nome} /></>}
        
        <label>Interesses de Jogo (Escolha suas Relíquias)</label>
        <div className="interesses-container">{OPCOES_INTERESSES.map(i => <div className="interesse-item" key={i}><input type="checkbox" id={i} name={i} checked={!!interesses[i]} onChange={handleInteresseChange} /><label htmlFor={i}>{i}</label></div>)}</div>

        {tipoUsuario === 'visitante_existente' && usuario.cla && renderizarSeletorCla()}
        {(tipoUsuario === 'novo_visitante' || (tipoUsuario === 'aluno' && !usuario.cla)) && renderizarCriacaoCla()}

        <button type="submit">Finalizar Check-in (Mandar o Dragão à Guerra)</button>
    </form>
  );

  return (
    <div className="container">
      <header><h1>SAVE POINT</h1></header>
      <main className="card">
        {passo === 1 && (
          <form onSubmit={handleIdentificar}>
            <h2>Portal de Acesso</h2>
            <label htmlFor="telefone">Telefone (Seu Token de Acesso)</label>
            <input type="tel" id="telefone" value={telefone} onChange={handleTelefoneChange} placeholder="(XX) XXXXX-XXXX" required />
            <button type="submit">Entrar na Guilda</button>
          </form>
        )}

        {passo === 2 && renderizarCheckinForm()}
        
        {passo === 3 && (
            <div className="resultado">
                <h2>Missão Concluída!</h2>
                <p>Olá, {usuario.nome}!</p>
                <div className="mensagem gamificacao-msg">{mensagemFinal}</div>
                {renderizarProgresso()}
                <button onClick={resetFlow}>Iniciar Nova Aventura</button>
            </div>
        )}
      </main>
      
      {/* Botão de Ranking - Aparece apenas no Passo 1 */}
      {passo === 1 && (
        <div className="ranking-button-container">
            <a href="/ranking" className="ranking-button">
                Ver Salão das Lendas (Ranking)
            </a>
        </div>
      )}
      
      {/* Pop-up de Recompensa: Só renderiza se tiver dados */}
      {showLevelUpToast && usuario.nome && dadosJogador && (
          <ToastRecompensa 
              nome={usuario.nome}
              nivel={dadosJogador.nivel}
              onClose={() => setShowLevelUpToast(false)}
          />
      )}
    </div>
  );
}

export default App;