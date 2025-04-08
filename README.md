# Prêmio CNA Brasil Artesanal - Geleia

Aplicação para coleta de avaliações de geleias com suporte para uso offline em tablets.

## Estrutura do Projeto

- **backend/**: API Flask e configurações do servidor
- **frontend/**: Interface de usuário (HTML, CSS, JS)
  - **static/**: Arquivos estáticos (CSS, JS, imagens)
  - **templates/**: Templates HTML

## Funcionalidades

- Coleta de avaliações de geleias (escala de 1 a 9)
- Funcionamento offline completo
- Sincronização automática quando online
- Identificação única para cada tablet
- Interface de administração para monitoramento

## Requisitos

- Python 3.9+
- PostgreSQL
- Navegador moderno com suporte a PWA

## Configuração para Produção no Heroku

### 1. Preparação

1. Instale o [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Faça login no Heroku:
   ```
   heroku login
   ```

### 2. Criação do Aplicativo Heroku

```bash
# Criar um novo aplicativo no Heroku
heroku create nome-do-seu-app

# Adicionar o banco de dados PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Configurar variáveis de ambiente
heroku config:set SECRET_KEY="sua_chave_secreta_aqui"
heroku config:set FLASK_ENV="production"
```

### 3. Deploy

```bash
# Inicializar repositório Git (se ainda não existir)
git init
git add .
git commit -m "Versão inicial"

# Adicionar o remote do Heroku
heroku git:remote -a nome-do-seu-app

# Fazer deploy
git push heroku main
```

### 4. Verificar o Deploy

```bash
# Abrir o aplicativo no navegador
heroku open

# Verificar logs
heroku logs --tail
```

## Configuração dos Tablets

Para configurar os 12 tablets para uso offline:

### 1. Preparação Inicial

1. Acesse a aplicação em cada tablet usando o Chrome ou outro navegador compatível com PWA
2. Instale a aplicação como PWA:
   - No Chrome, clique no ícone de menu (três pontos) > "Instalar aplicativo"
   - Confirme a instalação

### 2. Configuração de Cada Tablet

1. Abra o aplicativo instalado
2. Acesse a página de configuração (botão "Configuração")
3. Digite a senha de acesso: `geleia123`
4. Defina um número único para cada tablet (1-12)
5. Salve a configuração

### 3. Teste de Funcionamento Offline

1. Ative o modo avião no tablet
2. Abra o aplicativo e verifique se é possível:
   - Selecionar códigos de geleia
   - Enviar avaliações
   - Ver o status de sincronização pendente
3. Desative o modo avião
4. Verifique se as avaliações são sincronizadas automaticamente

## Sincronização de Dados

A aplicação implementa um sistema robusto de sincronização:

- **Automática**: Quando o dispositivo fica online, tenta sincronizar automaticamente
- **Manual**: Através da página de sincronização
- **Retry com backoff**: Tentativas falhas são repetidas com intervalos crescentes
- **Identificação de dispositivo**: Cada avaliação é associada ao tablet que a coletou

## Solução de Problemas

### Problemas de Sincronização

Se houver problemas com a sincronização:

1. Verifique a conexão com a internet
2. Acesse a página de sincronização e clique em "Forçar Sincronização"
3. Verifique o número de avaliações pendentes
4. Se persistir, reinicie o aplicativo

### Problemas de Instalação

Se houver problemas ao instalar como PWA:

1. Limpe o cache do navegador
2. Verifique se o navegador está atualizado
3. Tente usar o Chrome, que tem melhor suporte a PWA

### Problemas no Servidor

Se o servidor apresentar problemas:

1. Verifique os logs do Heroku: `heroku logs --tail`
2. Reinicie o servidor: `heroku restart`
3. Verifique o status do banco de dados: `heroku pg:info`

## Contato e Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento.
