# Auto Shine — App de Gestão de Estética Automotiva

App para o dono da estética fazer tudo pelo celular:

- **Início** — vendas e faturamento do dia, faturamento e lucro do mês, agenda de hoje, estoque baixo
- **Agenda** — agendamentos por dia, **lembrete no WhatsApp** com um toque e **"Concluir e cobrar"** (já abre a venda com o serviço e o cliente)
- **Vender** — toque no **+** dos serviços/produtos, desconto, forma de pagamento e **recibo enviado pelo WhatsApp** do cliente
- **Clientes** — cadastro com veículo e placa, botões de WhatsApp e ligar, total gasto e histórico de serviços
- **Serviços e produtos** — com **precificação**: custo + taxas + margem → preço sugerido, e a margem real de cada item
- **Estoque** — botões + e − para dar entrada e saída, com alerta de estoque baixo
- **Histórico** — vendas de hoje, 7 dias, mês ou tudo, com total e lucro; cancelar uma venda devolve os produtos ao estoque
- **Backup** — salva todos os dados num arquivo (pode mandar para o Google Drive ou WhatsApp) e restaura em outro celular
- Funciona **sem internet** depois de instalado, tem modo escuro automático e o botão "voltar" do Android fecha as janelas

É um **PWA** (Progressive Web App): fica hospedado de graça no GitHub Pages e o
Android instala como um app normal (ícone na tela inicial, tela cheia, sem barra do navegador).

> ⚠️ **Importante:** os dados ficam salvos **no próprio celular**. Faça backup
> de vez em quando (Mais › Fazer backup). Para vários funcionários usarem os
> mesmos dados em aparelhos diferentes, o próximo passo é ligar o app a um banco
> online gratuito (ex.: **Supabase**) — veja o final deste guia.

---

## Marca

Os arquivos da logo ficam na pasta `marca` (fora do app), para usar em redes sociais, cartões e fachada:

- `logo-icone.svg` / `logo-icone-1024.png` — símbolo (perfil do carro no anel)
- `logo-horizontal.svg` / `.png` — símbolo + nome, para fundo claro
- `logo-horizontal-fundo-escuro.svg` / `.png` — para fundo escuro
- Cores: azul-marinho `#0B1A33`, azul `#1E6DFF`, azul-claro `#6FA8FF`

## 1. Publicar grátis no GitHub Pages

1. Crie uma conta em <https://github.com>.
2. **New repository** → nome, ex.: `autoshine` → **Public** → **Create repository**.
3. Clique em **uploading an existing file** e arraste **todo o conteúdo desta pasta**
   (inclusive a pasta `icons`). Clique em **Commit changes**.
4. **Settings → Pages** → *Source*: **Deploy from a branch** → *Branch*: **main** / **(root)** → **Save**.
5. Em 1–2 minutos o app estará em `https://fabriciogiachetta.github.io/autoshine/`.


## 2. Usar o seu domínio da GoDaddy

Recomendado: um subdomínio, ex.: `app.autoshineapp.com`.

1. O arquivo **`CNAME`** desta pasta já contém `app.autoshineapp.com`.
2. No GitHub: **Settings → Pages → Custom domain** → mesmo domínio → **Save**.
3. Na GoDaddy: **Meus produtos → seu domínio → DNS → Adicionar registro**:

| Tipo  | Nome | Valor                   |
|-------|------|-------------------------|
| CNAME | app  | `fabriciogiachetta.github.io` |

Para usar o domínio principal (`autoshineapp.com`), crie 4 registros **A** com nome `@`
apontando para `185.199.108.153`, `185.199.109.153`, `185.199.110.153` e `185.199.111.153`
(apague antes o registro A "Parked" da GoDaddy), e um **CNAME** `www` → `fabriciogiachetta.github.io`.

4. Depois que o GitHub mostrar "DNS check successful", marque **Enforce HTTPS**
   (o HTTPS é obrigatório para o app poder ser instalado).

## 3. Instalar no celular Android

1. Abra o endereço do app no **Google Chrome** do celular.
2. Toque no botão **⬇** no topo do app, ou no menu **⋮ → Instalar app**.
3. Pronto: o ícone do Auto Shine aparece na tela inicial.
4. No primeiro acesso, crie seu usuário e senha.
5. Em **Mais › Dados da empresa**, coloque o nome da estética e a chave Pix (aparecem no recibo).

## 4. Publicar na Google Play Store

O app vai para a loja como um **TWA** (Trusted Web Activity): um app Android de verdade
que abre o Auto Shine em tela cheia. Tudo que você atualizar no GitHub aparece no app
da loja automaticamente, sem precisar enviar nova versão.

### 4.1 Antes de começar
- O app precisa estar publicado **no seu domínio com HTTPS** (passos 1 e 2).
  Use o domínio da GoDaddy: se um dia trocar de endereço, o app da loja para de funcionar.
- O e-mail de contato da política de privacidade é `autoshine.app@outlook.com`.

### 4.2 Gerar o pacote Android (grátis)
1. Acesse <https://www.pwabuilder.com>, cole o endereço do app (ex.: `https://app.autoshineapp.com`) e clique **Start**.
2. Clique em **Package for stores → Android → Generate Package**. Confira:
   - **Package ID:** `com.autoshineapp.app` (é o identificador permanente do app na loja)
   - **App name:** `Auto Shine`
   - **Signing key:** *Create new* → preencha seus dados e **anote as senhas**
3. Baixe o `.zip`. Dentro dele estão:
   - `*.aab` → o arquivo que vai para a Play Store
   - `signing.keystore` + `signing-key-info.txt` → **guarde em lugar seguro (Drive, pendrive)**.
     Sem eles você nunca mais consegue atualizar o app na loja.
   - `assetlinks.json` → prova que o app e o site são seus
4. Abra o `assetlinks.json` do zip, copie o conteúdo para o arquivo `.well-known/assetlinks.json`
   desta pasta (substituindo o modelo) e envie para o GitHub.
   Confira abrindo `https://app.autoshineapp.com/.well-known/assetlinks.json` no navegador.
   *(Se esse passo faltar, o app abre com uma barra de endereço no topo.)*

### 4.3 Conta e envio na Play Console
1. Crie a conta em <https://play.google.com/console> (taxa única de **US$ 25**, com verificação de identidade).
2. **Criar app** → nome `Auto Shine`, idioma Português (Brasil), **App**, **Gratuito**.
3. **Página da loja** — use os arquivos da pasta `loja-playstore`:
   - Ícone: `icone-loja-512.png`
   - Gráfico de destaque: `destaque-1024x500.png`
   - Capturas de tela: tire pelo menos 2 prints do app no seu celular (Início, Agenda, Vender…)
   - Descrição curta (até 80 caracteres): *Agenda, vendas, clientes e estoque da sua estética automotiva.*
4. **Conteúdo do app**:
   - Política de privacidade: `https://app.autoshineapp.com/privacidade.html`
   - Segurança dos dados: o app **não coleta nem compartilha dados** (tudo fica no aparelho)
   - Classificação de conteúdo: responda o questionário (app de produtividade/negócios, livre)
   - Público-alvo: maiores de 18 anos · Anúncios: **não**
5. **Testes → Teste fechado** → envie o `.aab`.

> ⚠️ **Contas pessoais novas** precisam fazer um **teste fechado com pelo menos 12 testadores
> por 14 dias seguidos** antes de liberar para todo mundo. Chame amigos, funcionários ou
> clientes com Android: eles entram pelo link de teste e mantêm o app instalado.
> Depois disso, peça o **acesso à produção** na Play Console.
> Contas de **empresa (CNPJ)** não têm essa exigência, mas pedem número D-U-N-S.

6. Após aprovado, **Produção → Criar versão** com o mesmo `.aab` → enviar para revisão (de algumas horas a alguns dias).

## 5. Próximo passo: dados na nuvem (multiusuário)

Para dono e funcionários verem os mesmos dados em celulares diferentes:

1. Criar um projeto grátis no **Supabase** (banco de dados + login prontos).
2. Criar as tabelas `clientes`, `produtos`, `vendas` e `agenda`.
3. Trocar o objeto `db` no `app.js` pelas chamadas do Supabase e o login local pelo `supabase.auth`.

O app continua hospedado de graça no GitHub Pages; só os dados passam a ficar no Supabase.

## Para testar no computador

O app precisa ser aberto por um servidor (não funciona abrindo o arquivo direto). Na pasta do projeto:

```bash
python -m http.server 5500 --directory gestao-estetica
```

Depois abra <http://localhost:5500>.
