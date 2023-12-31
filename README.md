
# Brazilian Courts Scrappers

Brazilian Courts Scrappers é uma biblioteca para fazer raspagem de dados (data scrapping) de processos judiciais dos portais de tribunais do Brasil.


## Instalação

Para instalar utilizando npm, na pasta de seu projeto, rode o seguinte comando*:

```bash
  npm install brazilian-courts-scrappers
```
*Como não se trata de uma ferramenta de desenvolvimento, não imaginamos nenhuma razão para instalar como `--save-dev`.
## Uso/Exemplos

Brazilian Courts Scrappers é uma ferramenta criada para ser injentada como _content script_. No momento, a biblioteca não faz requisições para os sites de tribunais; em vez disso, ela realiza comandos na janela do navegador (embora nada impeça que seja um navegador _headless_).

Para usá-la, basta seguir 3 passos: 

1. Importe a função `identifyCorrectScrapper`, passando como argumento um documento HTML. A função retornará uma classe com o scrapper correspondente ao Tribunal (ela usa `document.URL` para identificar o tribunal).

2. Instancie essa classe, passando como parâmetro o mesmo documento.

3. Você tem dois métodos principais: `checkProcessoHomepage()`, que verifica se o documento passado é a página inicial de um processo e retorna um `boolean`, e `fetchProcessoInfo()`, que realiza a raspagem de dados e retorna um objeto do tipo `ScrappedProcesso`, contendo as informações relevantes sobre o processo.

Por exemplo:

```javascript
import { identifyCorrectScrapper } from "brazilian-courts-scrappers";

const scrapperClass = identifyCorrectScrapper(document);
const scrapper = new scrapperClass(document);
if (!scrapper.checkProcessoHomepage()) return;
const processoInfo = await scrapper.fetchProcessoInfo()
console.log(processoInfo)
```


## Autores

- [@ironsand](https://github.com/ironsand-sou-eu)


## Licença

[Apache 2.0](https://choosealicense.com/licenses/apache-2.0/)