import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'
import Ranking from './Ranking.jsx' // Importe o novo componente
import './index.css'

const path = window.location.pathname;

// Define qual componente renderizar com base no caminho da URL
let ComponentToRender;
if (path === '/admin') {
  ComponentToRender = Admin;
} else if (path === '/ranking') {
  ComponentToRender = Ranking;
} else {
  ComponentToRender = App;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ComponentToRender />
  </React.StrictMode>,
)