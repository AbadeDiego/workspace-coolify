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

Em **Marketing → Novo conteúdo**, novos Reels criados por Diego para Social Media ou Marketing externo geram uma atividade de produção de **R$ 100,00**. O envio de uma versão registra a entrega para avaliação. Solicitar ajustes mantém o valor pendente; aprovar a versão libera o valor uma única vez no extrato da pessoa responsável, no mês da aprovação. A ficha de conteúdo concentra envio, revisão e aprovação. Conteúdos próprios, outros formatos, contratos e pagamentos anteriores mantêm suas condições.

Ao registrar a publicação de um Reel no Instagram, a plataforma gera atividades **sem remuneração** para compartilhar o vídeo nos Stories em **1, 3, 7, 14, 21 e 28 dias**, com sugestões de apresentação, pergunta, dica, bastidores, conversa e recapitulação. Datas em Brasília; colisões de repostagens automáticas da mesma conta são deslocadas para o próximo dia livre. Publicações antigas registradas agora começam a agenda a partir de hoje. O horário deve seguir os Insights da conta. As tarefas aparecem em Marketing, no calendário editorial e nas atividades diárias, com conclusão por evidência.

Na atualização, Reels publicados com a antiga agenda de duas repostagens recebem apenas as quatro ações adicionais. Datas, conclusões e evidências anteriores são preservadas. Essa atualização exige um perfil ativo de Social Media vinculado à startup e uma conta de Instagram válida; registros sem essas condições podem ser corrigidos pela ficha de publicação. Reiniciar a aplicação ou atualizar as métricas não duplica as tarefas. A automação organiza as atividades; a equipe realiza a publicação no Instagram. Não há integração de postagem automática com a Meta.
