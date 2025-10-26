import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [passo, setPasso] = useState(1); // 1: Telefone, 2: Check-in, 3: Sucesso
  const [telefone, setTelefone] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [usuario, setUsuario] = useState({});
  const [membrosPresentes, setMembrosPresentes] = useState({});
  const [novoMembro, setNovoMembro] = useState({ nome: '', telefone: '' });
  const [claMembros, setClaMembros] = useState([]);
  
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    nickname: '',
    interesses: '',
  });

  // PASSO 1: Identificar usuário
  const handleIdentificar = async (e) => {
    e.preventDefault();
    const { data } = await axios.post('http://localhost:3001/identificar', { telefone });
    setTipoUsuario(data.tipo);
    setUsuario(data);
    if(data.cla) { // Pre-seleciona o membro que fez login
        setMembrosPresentes({ [data.nome]: true });
    }
    setPasso(2);
  };

  // PASSO 2: Registrar visita
  const handleRegistrarVisita = async (e) => {
    e.preventDefault();
    const payload = {
      telefone,
      nomeCompleto: formData.nomeCompleto || usuario.nome,
      nickname: formData.nickname,
      interesses: formData.interesses.split(',').map(item => item.trim()),
      membrosPresentes: Object.keys(membrosPresentes).filter(key => membrosPresentes[key]),
      // AQUI ESTÁ A CORREÇÃO:
      novoCla: claMembros && claMembros.length > 0 ? { membros: claMembros } : null
    };
    const { data } = await axios.post('http://localhost:3001/registrar-visita', payload);
    setUsuario({ nome: data.nome });
    setMensagemFinal(data.mensagemGamificacao);
    setPasso(3);
  };

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleMembroChange = (e) => setNovoMembro(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const addMembroCla = () => {
      if(novoMembro.nome && novoMembro.telefone) {
          setClaMembros([...claMembros, novoMembro]);
          setNovoMembro({ nome: '', telefone: '' });
      }
  }
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setMembrosPresentes(prev => ({ ...prev, [name]: checked }));
  }

  // --- Renderização dos Componentes ---
  const renderizarCheckinForm = () => (
    <form onSubmit={handleRegistrarVisita}>
        <h2>Bem-vindo, {usuario.nome}!</h2>
        {tipoUsuario === 'novo_visitante' && (
            <><label>Seu Nome Completo</label><input type="text" name="nomeCompleto" onChange={handleInputChange} required /></>
        )}
        <label>Seu Nickname (Opcional)</label><input type="text" name="nickname" onChange={handleInputChange} />
        <label>Quais jogos te interessam hoje? (separe por vírgula)</label><input type="text" name="interesses" required onChange={handleInputChange} />
        
        {/* Lógica de Clãs */}
        {tipoUsuario === 'visitante_existente' && usuario.cla && renderizarSeletorCla()}
        {tipoUsuario === 'novo_visitante' && renderizarCriacaoCla()}

        <button type="submit">Registrar Visita</button>
    </form>
  );

  const renderizarCriacaoCla = () => (
    <div className="cla-section">
        <h4>Quer registrar seu Clã (Família)?</h4>
        {claMembros.map((m, i) => <div key={i} className="membro-tag">{m.nome}</div>)}
        <input type="text" name="nome" placeholder="Nome do familiar" value={novoMembro.nome} onChange={handleMembroChange} />
        <input type="text" name="telefone" placeholder="Telefone do familiar" value={novoMembro.telefone} onChange={handleMembroChange} />
        <button type="button" onClick={addMembroCla}>Adicionar Membro</button>
    </div>
  );

  const renderizarSeletorCla = () => (
    <div className="cla-section">
        <h4>Quem do seu clã está com você?</h4>
        {usuario.cla.membros.map(membro => (
            <div className="aluno-check" key={membro.nome}>
                <input type="checkbox" id={membro.nome} name={membro.nome} checked={!!membrosPresentes[membro.nome]} onChange={handleCheckboxChange} />
                <label htmlFor={membro.nome}>{membro.nome}</label>
            </div>
        ))}
    </div>
  );
  
  const [mensagemFinal, setMensagemFinal] = useState('');
  const resetFlow = () => { setTelefone(''); setPasso(1); setClaMembros([])}

  return (
    <div className="container">
      <header><h1>SAVE POINT</h1></header>
      <main className="card">
        {passo === 1 && <form onSubmit={handleIdentificar}><h2>Portal de Acesso</h2><label>Seu Telefone</label><input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} required /><button type="submit">Avançar</button></form>}
        {passo === 2 && renderizarCheckinForm()}
        {passo === 3 && <div className="resultado"><h2>Check-in Realizado, {usuario.nome}!</h2><div className="mensagem gamificacao-msg">{mensagemFinal}</div><button onClick={resetFlow}>Finalizar</button></div>}
      </main>
    </div>
  );
}

export default App;