**Diário de Treinos**  
Aplicação web para atletas de **corrida** e **natação** registrarem seus treinos e acompanharem a evolução do próprio desempenho. Cada usuário cria sua conta, grava seus treinos na nuvem e acompanha o ritmo (min/km na corrida e min/100m na natação) em gráficos. O app também busca a temperatura do dia do treino em uma API pública de clima.  
**Integrantes**  
**Danilo de Araujo Alves Soares**  
**Link da aplicação**  
[https://danilosoares-web.github.io/trabalhoweb2/](https://danilosoares-web.github.io/trabalhoweb2/ "https://danilosoares-web.github.io/trabalhoweb2/")  
**Funcionalidades**  
- **Página inicial** com apresentação do app e acesso ao login  
- **Login e cadastro** de usuários com e-mail e senha (Firebase Authentication)  
- **Painel** com cartões de resumo (total de treinos, km corridos, metros nadados e melhor ritmo de corrida), formulário de novo treino e gráficos de evolução  
- **Meus treinos**: página separada com todos os treinos gravados, filtro por modalidade e botões de editar e excluir  
- Cada usuário vê **apenas os próprios treinos**  
- Cálculo automático do ritmo de cada treino  
- Busca automática da temperatura do dia do treino, a partir da cidade informada  
- Botão para gerar dados de exemplo e botão para apagar todos os treinos  
- Mensagens de carregamento, sucesso e erro  
- Layout responsivo, para computador e celular  
**API utilizada**  
**Open-Meteo** ([https://open-meteo.com), gratuita e sem necessidade de chave.](https://open-meteo.com "https://open-meteo.com")  
- *Geocoding API*: transforma o nome da cidade em coordenadas.  
- *Forecast / Archive API*: retorna a temperatura média do dia do treino.  
As requisições são feitas com `fetch`, com tratamento de erros. Se a busca falhar, o treino é salvo normalmente, sem a temperatura.  
**Banco de dados e autenticação**  
**Firebase**, com dois serviços:  
- **Authentication** (e-mail e senha): cadastro e login dos usuários.  
- **Cloud Firestore** (banco NoSQL online): armazena os treinos na coleção `treinos`.  
Cada documento da coleção `treinos` tem os campos:  
  
|  |  |  
| - | - |  
| **Campo** |  **Descrição** |  
| `uid` |  Identificador do usuário dono do treino |  
| `modalidade` |  `corrida` ou `natacao` |  
| `data` |  Data do treino (AAAA-MM-DD) |  
| `distancia` |  Em km (corrida) ou metros (natação) |  
| `tempo` |  Duração em minutos |  
| `esforco` |  Esforço percebido, de 1 a 10 |  
| `cidade` |  Cidade do treino (opcional) |  
| `temperatura` |  Temperatura média do dia em °C (opcional) |  
  
   
**Regras de segurança do Firestore**  
Cada usuário só lê, altera e exclui os treinos que têm o seu próprio `uid`:  
```  
rules_version = '2';  
 service cloud.firestore {  
   match /databases/{database}/documents {  
     match /treinos/{id} {  
       allow read, update, delete: if request.auth != null  
                                   && resource.data.uid == request.auth.uid;  
       allow create: if request.auth != null  
                     && request.resource.data.uid == request.auth.uid;  
     }  
   }  
 }  
   
```  
**Operações CRUD**  
- **Create:** formulário "Novo treino" no Painel  
- **Read:** página "Meus treinos", gráficos e cartões de resumo  
- **Update:** botão "Editar" em cada treino, que abre o treino no formulário do Painel  
- **Delete:** botão "Excluir" em cada treino, na página "Meus treinos"  
**Tecnologias**  
- HTML, CSS e JavaScript puros, em arquivos separados  
- Firebase Authentication e Cloud Firestore (SDK via CDN)  
- Chart.js (gráficos)  
- GitHub Pages (hospedagem)  
**Estrutura do projeto**  
```  
trabalhoweb2/  
 ├── index.html     # página inicial  
 ├── login.html     # tela de login e cadastro  
 ├── painel.html    # painel: resumo, formulário e gráficos  
 ├── treinos.html   # lista de treinos gravados  
 ├── style.css      # estilos e layout responsivo  
 ├── comum.js       # configuração do Firebase e funções compartilhadas  
 ├── login.js       # lógica do login e cadastro  
 ├── script.js      # lógica do painel (CRUD, API e gráficos)  
 ├── treinos.js     # lógica da página de treinos  
 ├── nadador.jpg    # foto da página inicial  
 ├── corredor.jpg   # foto da página inicial  
 ├── README.md  
 └── img/           # capturas de tela  
   
```  
**Como usar**  
1. Acesse o link da aplicação e clique em **Começar agora**.  
2. Crie sua conta com e-mail e senha (mínimo de 6 caracteres) ou entre, se já tiver cadastro.  
3. No **Painel**, preencha o formulário "Novo treino" e clique em **Salvar treino**. Informe a cidade se quiser registrar a temperatura do dia.  
4. Acompanhe a evolução do ritmo e da distância nos gráficos. Use o filtro para alternar entre corrida e natação.  
5. Em **Meus treinos**, veja todos os treinos gravados. Use **Editar** ou **Excluir** em qualquer um deles.  
6. Para ver o app com bastante informação, clique em **Gerar dados de exemplo** no Painel. Para limpar, use **Apagar todos os treinos**.  
7. Clique em **Sair** quando terminar.  
**Como rodar localmente**  
1. Clone o repositório.  
2. Crie um projeto no [Firebase, ative o **Authentication** (método e-mail/senha) e o **Firestore**, e publique as regras de segurança acima.](https://console.firebase.google.com "https://console.firebase.google.com")  
3. Cole o seu `firebaseConfig` no início do arquivo `comum.js`.  
4. Abra o projeto com um servidor local, como a extensão *Live Server* do VS Code. O app não funciona abrindo o `index.html` direto no navegador, porque usa módulos JavaScript.  
**Capturas de tela**  
**Página inicial**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAxElEQVR4nO1W0Q6AIAiE/v+bpaeaYyYc6NLVvbRm484DL1lEKAIRIWaG1zQ4IgAhsHCMJkc31BXQKmbtvF73iOkKQIvV8LbpFqAJ9Dvac2Z2iQ4N4UiYQ2gJ9G7g6TsupQw7UpHjefTCBCEmwueEaPAMhBzQBVDC+tkit2pOOQWXEx5H0gIy/ScK/Atq0os4k5ihHOilHJyYyyfhTIjIJg48idQ5EME6DrwlZB0HthaQcRG+FbeQuaZ/ewb2ScJfQBSe9p77EZ7a26s/yQAAAABJRU5ErkJggg==)  
**Login**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAxElEQVR4nO1W0Q6AIAiE/v+bpaeaYyYc6NLVvbRm484DL1lEKAIRIWaG1zQ4IgAhsHCMJkc31BXQKmbtvF73iOkKQIvV8LbpFqAJ9Dvac2Z2iQ4N4UiYQ2gJ9G7g6TsupQw7UpHjefTCBCEmwueEaPAMhBzQBVDC+tkit2pOOQWXEx5H0gIy/ScK/Atq0os4k5ihHOilHJyYyyfhTIjIJg48idQ5EME6DrwlZB0HthaQcRG+FbeQuaZ/ewb2ScJfQBSe9p77EZ7a26s/yQAAAABJRU5ErkJggg==)  
**Painel com gráficos de evolução**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAxElEQVR4nO1W0Q6AIAiE/v+bpaeaYyYc6NLVvbRm484DL1lEKAIRIWaG1zQ4IgAhsHCMJkc31BXQKmbtvF73iOkKQIvV8LbpFqAJ9Dvac2Z2iQ4N4UiYQ2gJ9G7g6TsupQw7UpHjefTCBCEmwueEaPAMhBzQBVDC+tkit2pOOQWXEx5H0gIy/ScK/Atq0os4k5ihHOilHJyYyyfhTIjIJg48idQ5EME6DrwlZB0HthaQcRG+FbeQuaZ/ewb2ScJfQBSe9p77EZ7a26s/yQAAAABJRU5ErkJggg==)  
**Meus treinos**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAxElEQVR4nO1W0Q6AIAiE/v+bpaeaYyYc6NLVvbRm484DL1lEKAIRIWaG1zQ4IgAhsHCMJkc31BXQKmbtvF73iOkKQIvV8LbpFqAJ9Dvac2Z2iQ4N4UiYQ2gJ9G7g6TsupQw7UpHjefTCBCEmwueEaPAMhBzQBVDC+tkit2pOOQWXEx5H0gIy/ScK/Atq0os4k5ihHOilHJyYyyfhTIjIJg48idQ5EME6DrwlZB0HthaQcRG+FbeQuaZ/ewb2ScJfQBSe9p77EZ7a26s/yQAAAABJRU5ErkJggg==)  
**Versão para celular**  
![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAxElEQVR4nO1W0Q6AIAiE/v+bpaeaYyYc6NLVvbRm484DL1lEKAIRIWaG1zQ4IgAhsHCMJkc31BXQKmbtvF73iOkKQIvV8LbpFqAJ9Dvac2Z2iQ4N4UiYQ2gJ9G7g6TsupQw7UpHjefTCBCEmwueEaPAMhBzQBVDC+tkit2pOOQWXEx5H0gIy/ScK/Atq0os4k5ihHOilHJyYyyfhTIjIJg48idQ5EME6DrwlZB0HthaQcRG+FbeQuaZ/ewb2ScJfQBSe9p77EZ7a26s/yQAAAABJRU5ErkJggg==)  
**Créditos**  
- Fotos da página inicial: AUTOR DA FOTO DO NADADOR e AUTOR DA FOTO DO CORREDOR, via Unsplash/Pexels  
- Dados de clima: [Open-Meteo](https://open-meteo.com "https://open-meteo.com")  
