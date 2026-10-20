🚀 Sobre o Projeto

O Junin Barbeiro é um SaaS projetado para otimizar o fluxo de atendimento de barbearias modernas. Ele oferece uma experiência fluida para os clientes realizarem agendamentos online e uma área administrativa robusta e segura para os barbeiros gerenciarem serviços, preços, horários e o status dos agendamentos em tempo real.

✨ Principais Funcionalidades

Fluxo de Agendamento Inteligente (Cliente):

Escolha intuitiva de serviços e preços atualizados.

Seleção de horários disponíveis integrada ao banco de dados.

Área Administrativa Segura (Barbeiros):

Login restrito por E-mail & Senha ou PIN rápido de 4 dígitos.

Gestão centralizada de serviços e catálogo da barbearia.

Painel de Gestão de Agendamentos: Visualização de todos os horários marcados com opções para confirmar, cancelar ou registrar faltas (no-show).

Design Moderno (Dark Mode & Neon):

Interface desenvolvida com TailwindCSS e ícones dinâmicos (lucide-react), trazendo identidade visual exclusiva em tons de ciano neon e acabamento premium.

🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando tecnologias modernas de mercado:

Frontend: React, TypeScript, Vite, TailwindCSS

Ícones: Lucide React

Banco de Dados & Backend: Supabase (PostgreSQL em nuvem)

Hospedagem & Deploy Contínuo: Vercel

📦 Como Executar o Projeto Localmente

Se desejar rodar o projeto na sua máquina para testes ou desenvolvimento:

Clone o repositório:

git clone https://github.com/fabiomatheus-16/juninho-barbearia-agendamento.git
cd juninho-barbearia-agendamento


Instale as dependências:

npm install


Configure as Variáveis de Ambiente:
Crie um arquivo .env na raiz do projeto com as suas credenciais do Supabase:

VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_aqui


Inicie o servidor de desenvolvimento:

npm run dev


🌐 Deploy e Produção

O projeto está configurado para deploy automático na Vercel sempre que um git push é realizado na branch principal (main).

📄 Licença

Distribuído sob a licença MIT. Sinta-se à vontade para utilizar, modificar e adaptar este projeto para o seu negócio!
