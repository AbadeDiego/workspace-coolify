# Workspace na VPS com Coolify

A aplicação reúne a interface responsiva, a API Node.js 24 e o PostgreSQL 18. A API valida acesso por perfil e startup. O banco prepara o esquema e os cadastros iniciais na primeira inicialização. O volume `workspace-postgres` guarda os dados entre atualizações dos contêineres.

A carga inicial inclui Diego, Eduarda, Larissa, Annike e Vanessa, suas startups, modelos de processos, os três produtos de materiais de palma e os **93 leads de prospecção ativa do Coleta Certa**. A conta de Diego é criada com as credenciais definidas na primeira implantação. Os quatro demais perfis ficam suspensos até você definir e-mail e senha em **Pessoas → Perfil e acesso**. A base começa sem as atividades, contratos e valores fictícios do protótipo. Registros feitos localmente na antiga versão HTML ficam no navegador de origem, pois o servidor recebe apenas os dados incluídos no pacote.

## Implantar na VPS

1. Extraia o ZIP. Suba o conteúdo da pasta `workspace-coolify` para a raiz de um **repositório privado**, incluindo os arquivos que começam com ponto. O pacote contém os dados de prospecção semeados em `src/seed.json`.
2. Aponte o registro DNS do subdomínio escolhido para o IP da VPS da Hostinger. Confirme que o proxy do Coolify está ativo e que as portas TCP 80 e 443 estão acessíveis.
3. No Coolify, crie **Application** a partir do repositório privado. Selecione **Docker Compose** e indique `/compose.yaml` com Base Directory `/`. Se mantiver a pasta dentro do repositório, use `/workspace-coolify` como Base Directory.
4. Nas variáveis da aplicação, configure os valores da tabela abaixo. Em **Domains**, adicione o domínio HTTPS ao serviço `app` com porta interna **3000**. O serviço `db` fica na rede interna.
5. Clique em **Deploy**. Aguarde os dois serviços ficarem saudáveis. Abra `https://SEU-DOMINIO/healthz` e confirme `{"ok":true}`. Abra o endereço principal, entre com a conta de Diego e ative os demais perfis.

| Variável | Valor |
| --- | --- |
| `APP_ORIGIN` | URL pública exata, por exemplo `https://workspace.seudominio.com.br`. Omita a porta interna 3000 e o caminho. |
| `POSTGRES_PASSWORD` | Senha aleatória longa. Use o mesmo valor enquanto esse volume existir. Alterar a variável após a inicialização exige alterar a senha no PostgreSQL também. |
| `ADMIN_EMAIL` | E-mail de Diego no primeiro deploy. |
| `ADMIN_PASSWORD` | Senha inicial de Diego com pelo menos 12 caracteres e até 256 bytes. |

Depois de validar o primeiro login, você pode limpar `ADMIN_PASSWORD` no Coolify. Em um banco existente, editar essa variável não altera a senha da conta. Use a ficha de Diego em **Pessoas** para alterar sua senha. O login usa a origem HTTPS configurada em `APP_ORIGIN`.

[Documentação do Docker Compose no Coolify](https://coolify.io/docs/applications/builds/docker-compose) · [Domínios do Coolify](https://coolify.io/docs/core/networking/domains)

## Rotinas de Social Media

Ao registrar a publicação de um Reel no Instagram em **Marketing**, o Workspace cria duas atividades em **Meu dia**, com prazos de 7 e 14 dias a partir da publicação. A pessoa responsável abre o Reel original a partir da atividade, compartilha nos Stories pelo Instagram e registra a evidência na conclusão. Essas atividades não geram remuneração.

Em **Remuneração da equipe → Crescimento de seguidores**, Diego valida a contagem total de cada conta do Instagram. A primeira medição de uma conta é a base. As posteriores creditam somente o crescimento acima da maior contagem já validada. A cada 1.000 seguidores novos acumulados nas contas da pessoa, entram R$ 500 no extrato de **Finanças pessoais**, no mês da validação. O restante segue acumulado para o próximo bloco.

## Backup e restauração

Faça backup periódico e guarde cópias fora da VPS. O banco inclui registros e anexos. No terminal da VPS, encontre o contêiner pelo Coolify ou com `docker ps`. Substitua `NOME_DO_CONTAINER_DB` abaixo.

```sh
docker exec NOME_DO_CONTAINER_DB pg_dump -U workspace -d workspace -Fc -T workspace_sessions -T login_attempts > workspace.dump
```

O dump preserva a estrutura e os dados de negócio. As tabelas de sessão e tentativas serão recriadas vazias pela aplicação. Teste a restauração em um PostgreSQL separado, com um banco vazio, antes de qualquer substituição em produção.

```sh
docker exec -i NOME_DO_CONTAINER_TESTE pg_restore -U workspace -d workspace --no-owner --no-privileges --exit-on-error < workspace.dump
```

Atualize o app via deploy do repositório mantendo o volume. O contêiner define uma verificação de saúde para a API e outra para o PostgreSQL. O banco persiste em SQL com registros JSONB e transações para os fluxos com vários registros.

## Testes

```sh
npm ci
TEST_DATABASE_URL=postgres://USUARIO:SENHA@HOST:5432/postgres npm test
```

Use um servidor de teste. A suíte cria e remove um banco temporário e verifica os cinco perfis, escopos de acesso, os 93 leads, anexos, aprovação de entregas, propostas, pagamentos concorrentes e continuidade após reiniciar a aplicação.

## Desenvolvimento de materiais

Em **Desenvolvimento de materiais**, novos produtos começam em **Ideação**. Ao abrir um material, registre o TRL avaliado, a justificativa e, quando disponível, o link de referência. O histórico mostra cada mudança de nível com data e autor. Materiais já cadastrados mantêm a etapa informada e ficam com TRL a avaliar até o primeiro registro.

Em **Experimentos**, crie os roteiros com objetivo, hipótese, materiais e quantidades, procedimento e critérios de avaliação. Cada revisão gera uma versão. Ao registrar um resultado, escolha o roteiro utilizado. O resultado guarda uma cópia daquela versão, mesmo após revisões posteriores.

Ao criar uma atividade do material, os campos opcionais **Início do trabalho** e **Fim do trabalho** registram uma atuação já realizada. Para novos períodos na mesma atividade, use **Horas de trabalho → Registrar período**. Registre separadamente preparação, execução acompanhada e análise. Intervalos de espera do experimento ficam fora desses períodos. O sistema soma o tempo dedicado por pessoa e material e rejeita horários sobrepostos da mesma pessoa.

## Reels e agenda de Stories

Em **Marketing → Novo conteúdo**, Diego pode marcar **Remunerar a produção com R$ 100,00** ao criar um Reel para Social Media ou Marketing externo. Essa opção gera a atividade de produção remunerada. Sem marcar, o conteúdo é criado sem remuneração. O envio de uma versão registra a entrega para avaliação. Solicitar ajustes mantém o valor pendente; aprovar a versão libera o valor uma única vez no extrato da pessoa responsável, no mês da aprovação. A ficha de conteúdo concentra envio, revisão e aprovação. Conteúdos próprios, outros formatos, contratos e pagamentos anteriores mantêm suas condições.

Ao registrar a publicação de um Reel no Instagram, a plataforma gera atividades **sem remuneração** para compartilhar o vídeo nos Stories em **1, 3, 7, 14, 21 e 28 dias**, com sugestões de apresentação, pergunta, dica, bastidores, conversa e recapitulação. Datas em Brasília; colisões de repostagens automáticas da mesma conta são deslocadas para o próximo dia livre. Publicações antigas registradas agora começam a agenda a partir de hoje. O horário deve seguir os Insights da conta. As tarefas aparecem em Marketing, no calendário editorial e nas atividades diárias, com conclusão por evidência.

Na atualização, Reels publicados com a antiga agenda de duas repostagens recebem apenas as quatro ações adicionais. Datas, conclusões e evidências anteriores são preservadas. Essa atualização exige um perfil ativo de Social Media vinculado à startup e uma conta de Instagram válida; registros sem essas condições podem ser corrigidos pela ficha de publicação. Reiniciar a aplicação ou atualizar as métricas não duplica as tarefas. A automação organiza as atividades; a equipe realiza a publicação no Instagram. Não há integração de postagem automática com a Meta.

## Comercial: horas, indicadores e remuneração mensal

O perfil Comercial, incluindo Eduarda, passa a ter referência de **20 horas por semana e R$ 1.500 por mês**, a partir da competência novembro/2026. A carga semanal soma o trabalho entre todas as startups da pessoa, de segunda a domingo. Não é feita conversão fixa para 80 horas mensais: semanas que atravessam meses mostram a carga da semana inteira e os minutos pertencentes à competência separadamente.

Em **Horas e resultados → Registrar período**, ou ao abrir uma atividade do Comercial, registre início e fim do trabalho, o que foi feito, indicador e quantidade, resultado observado e próximo passo. Um lead da mesma pessoa/startup e um link de evidência podem ser vinculados. Exclua pausas dos períodos. O servidor impede horários sobrepostos, inclusive com registros de desenvolvimento. Cada registro fica vinculado à atividade, pessoa e startup; atividades com horas não podem ser excluídas ou transferidas para outra pessoa/startup.

O painel combina as horas com os resultados do CRM: primeiras abordagens, reuniões realizadas, propostas enviadas, contratos fechados e receita contratada no mês. Indicadores informados nos registros de horas ficam identificados no histórico e não são somados novamente ao CRM. O campo **Indicador e resultado esperado** ajuda a definir a entrega da atividade; sua conclusão continua exigindo evidência.

Diego pode solicitar esclarecimentos do mês e invalidar um período com justificativa, preservando o original para auditoria. A pessoa registra então o intervalo corrigido. Depois do encerramento do mês e com períodos registrados, Diego pode aprovar o fechamento, com avaliação obrigatória das horas e dos resultados. Isso inclui **R$ 1.500 uma única vez** no extrato da competência e preserva os períodos daquele mês. Não há descontos, adicionais por horas extras ou liberação de pagamento automáticos. O lançamento no extrato representa o valor aprovado a receber, sem efetuar transferência bancária.

Novas atividades comerciais seguem o modelo mensal; não recebem novos valores individuais. Atividades remuneradas e lançamentos anteriores preservam suas condições e histórico. A referência mensal, o status da avaliação e o valor aprovado aparecem em **Finanças pessoais**, separados dos lançamentos por atividade existentes.

## Navegação mobile das atividades

Em telas de até 700 px, **Atividades** e **Meu dia** usam uma lista compartilhada para os cinco perfis. A navegação apresenta listas pessoais, startups e, para a Gestão, a equipe; busca por texto; filtros rápidos para todas, hoje, atrasadas e próximas; e um painel inferior para ordenar por prioridade/prazo, data de execução, prazo, destaques recentes ou título. Filtros adicionais permitem selecionar pessoa, prioridade e status. No Desenvolvimento de materiais, a mesma lista mantém a separação por produto.

As atividades concluídas ficam recolhidas, com opção de expandir. Cada lista carrega até 40 itens por vez e permite mostrar mais. O botão flutuante cria atividades; tocar no círculo de conclusão abre o fluxo de evidência existente. A remuneração e as aprovações seguem as mesmas regras. O calendário e o balanço do contrato da Annike, além das filas comercial e editorial em Meu dia, continuam disponíveis.

Estrelas são destaques pessoais salvos no banco por usuário, independentes da prioridade definida pela Gestão e dos destaques das outras pessoas. A ordenação e os filtros alteram apenas a visualização. A exportação de dados foi removida de todos os módulos e de todas as resoluções; downloads de evidências e materiais entregues foram preservados.

## Visão Geral e Metas

Em telas de até 700 px, **Visão Geral** prioriza os quatro indicadores principais, decisões da Gestão, próximas entregas e metas em foco. Mais indicadores, gráficos, portfólio, ritmo da equipe e evolução ficam em seções expansíveis, com os mesmos dados e ações. O painel inferior de filtros reúne startup, período e datas personalizadas. Os indicadores continuam clicáveis para abrir os registros correspondentes.

**Metas** usa cartões com progresso, alvo, unidade, pessoa e ciclo, além de busca, filtros por situação/pessoa e ordenação por prazo, progresso ou título. No celular, metas atingidas e inativas ficam recolhidas quando a seleção é “Todas”. Ao abrir uma meta, o detalhe apresenta os resultados vinculados ao ciclo, permite iniciar o registro com a meta selecionada e mantém o ajuste de alvo restrito à Gestão. O filtro geral de período altera o histórico de resultados; o progresso continua usando o ciclo próprio da meta e a contribuição da startup selecionada.

Vanessa usa os mesmos componentes em Visão Geral e Metas, preservando produto, unidade, período e evidências de cada resultado. O TRL e seu histórico ficam acessíveis em seção expansível no celular. Experimentos, registros de trabalho e a navegação por materiais continuam disponíveis. As mudanças são de interface; não modificam APIs, consultas, regras de cálculo ou permissões.

## Fluxo contínuo e valores opcionais

Na criação de atividades, Gestão e Marketing (incluindo Marketing externo) podem escolher **Pontual** ou **Fluxo contínuo**. No fluxo contínuo, **Registrar execução** solicita a data e a evidência do trabalho. A atividade principal permanece ativa e cada execução fica registrada no histórico, com acesso às evidências e à avaliação. Não há geração de recorrências por calendário. A Gestão ou quem criou a atividade pode encerrar o fluxo com justificativa. A pessoa, a startup e o tipo do fluxo ficam preservados após o primeiro registro.

**Vincular remuneração ou bonificação** é uma opção desmarcada por padrão nas atividades novas da Gestão. Diego pode definir um valor base, somente uma bonificação por resultado, ou ambos. Se a opção não for marcada, a atividade não gera valor financeiro. Marketing cria atividades próprias sem poder atribuir pagamento a si. As regras mensais do Comercial e as repostagens gratuitas continuam preservadas.

Em um fluxo com valores, cada execução recebe uma cópia das condições vigentes naquele momento. O valor base depende da aprovação de qualidade e a bonificação exige resultado comprovado. Alterar as condições das próximas execuções não modifica entregas já registradas. A atividade principal não entra na previsão de pagamentos; somente as execuções entregues são avaliadas. Repetir o envio do mesmo formulário não cria duas execuções nem dois pagamentos.

Novos Reels só geram o valor de R$ 100 quando Diego marca a remuneração opcional ao criar a demanda. Contratações e pagamentos existentes são preservados.
