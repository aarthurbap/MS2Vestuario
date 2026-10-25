import { database } from "./config/database";
import { VendaModel } from "./models/VendaModel";

// Executa verificações integradas de venda, estoque, filtros e cancelamento.
// Os cenários inserem e atualizam registros no banco MySQL configurado.
async function runComprehensiveTests() {
  console.log("=================================================");
  console.log("  SUÍTE DE TESTES CRÍTICOS - SISTEMA ERP/PDV");
  console.log("=================================================");

  // Pegar operador
  const [users]: any = await database.execute("SELECT id, nome, perfil FROM usuarios LIMIT 1");
  if (!users || users.length === 0) throw new Error("Nenhum usuário cadastrado para teste.");
  const usuario = users[0];
  console.log(`Operador de teste: ID ${usuario.id} (${usuario.nome})`);

  // Cadastrar cliente de teste se não houver
  await database.execute(
    `INSERT INTO clientes (nome, cpf, email, telefone)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE nome = VALUES(nome)`,
    ['Cliente Teste Automatizado', '111.222.333-44', 'teste@ms2.com.br', '(11) 98888-7777']
  );
  const [cliRes]: any = await database.execute("SELECT id, nome FROM clientes WHERE cpf = '111.222.333-44'");
  const cliente = cliRes[0];
  console.log(`Cliente de teste: ID ${cliente.id} (${cliente.nome})`);

  // Criar 2 produtos com estoques controlados
  await database.execute(
    `INSERT INTO produtos (codigo, nome, descricao, estoque, preco, ativo)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE estoque = 1, preco = 120.00, ativo = 1`,
    ['PROD-UNIT-1', 'Vestido Floral Última Unidade', 'Vestido teste estoque 1', 1, 120.00]
  );
  const [p1Res]: any = await database.execute("SELECT id, codigo, estoque FROM produtos WHERE codigo = 'PROD-UNIT-1'");
  const prodUnit = p1Res[0];

  await database.execute(
    `INSERT INTO produtos (codigo, nome, descricao, estoque, preco, ativo)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE estoque = 20, preco = 49.90, ativo = 1`,
    ['PROD-MULT-2', 'Camiseta Básica Algodão', 'Camiseta teste estoque 20', 20, 49.90]
  );
  const [p2Res]: any = await database.execute("SELECT id, codigo, estoque FROM produtos WHERE codigo = 'PROD-MULT-2'");
  const prodMulti = p2Res[0];

  // -------------------------------------------------------------------------
  // TESTE 1: Finalizar venda válida com cliente identificado e pagamento em Cartão
  // -------------------------------------------------------------------------
  console.log("\n[TESTE 1] Finalizar venda com cliente identificado e pagamento no cartão");
  const vendaId1 = await VendaModel.createComplete({
    clienteId: cliente.id,
    usuarioId: usuario.id,
    subtotal: 99.80,
    desconto: 9.80,
    total: 90.00,
    itens: [{ produtoId: prodMulti.id, quantidade: 2, precoUnitario: 49.90 }],
    pagamentos: [{ formaPagamentoId: 3, valor: 90.00 }] // Cartão de crédito
  });
  console.log(`-> Venda gerada: ID #${vendaId1}`);

  const v1Detalhe = await VendaModel.findById(vendaId1);
  if (!v1Detalhe || v1Detalhe.clienteNome !== cliente.nome || v1Detalhe.total !== 90.00) {
    throw new Error("Falha na validação do Teste 1!");
  }
  console.log("-> ✅ APROVADO: Venda registrada com integridade, desconto e cliente corretos.");

  // -------------------------------------------------------------------------
  // TESTE 2: Vender a última unidade (estoque deve ir a 0 exatamente)
  // -------------------------------------------------------------------------
  console.log("\n[TESTE 2] Vender última unidade de um produto (estoque = 1 -> estoque = 0)");
  const vendaId2 = await VendaModel.createComplete({
    clienteId: null, // Consumidor não identificado
    usuarioId: usuario.id,
    subtotal: 120.00,
    desconto: 0,
    total: 120.00,
    itens: [{ produtoId: prodUnit.id, quantidade: 1, precoUnitario: 120.00 }],
    pagamentos: [{ formaPagamentoId: 2, valor: 120.00 }] // Pix
  });
  const [estPos]: any = await database.execute("SELECT estoque FROM produtos WHERE id = ?", [prodUnit.id]);
  if (estPos[0].estoque !== 0) throw new Error("Estoque deveria ser exatamente 0!");
  console.log(`-> Estoque atualizado: ${estPos[0].estoque} un.`);
  console.log("-> ✅ APROVADO: Última unidade vendida e estoque zerado sem ficar negativo.");

  // -------------------------------------------------------------------------
  // TESTE 3: Tentar vender produto com estoque esgotado (deve lançar erro e fazer rollback)
  // -------------------------------------------------------------------------
  console.log("\n[TESTE 3] Tentativa de venda de produto esgotado (estoque = 0)");
  let bloqueouEsgotado = false;
  try {
    await VendaModel.createComplete({
      clienteId: null,
      usuarioId: usuario.id,
      subtotal: 120.00,
      desconto: 0,
      total: 120.00,
      itens: [{ produtoId: prodUnit.id, quantidade: 1, precoUnitario: 120.00 }],
      pagamentos: [{ formaPagamentoId: 1, valor: 120.00 }]
    });
  } catch (err: any) {
    bloqueouEsgotado = true;
    console.log(`-> Bloqueio acionado com sucesso: "${err.message}"`);
  }
  if (!bloqueouEsgotado) throw new Error("Deveria ter bloqueado a venda de produto sem estoque!");
  console.log("-> ✅ APROVADO: Operação bloqueada e rollback efetuado.");

  // -------------------------------------------------------------------------
  // TESTE 4: Consultar vendas com filtros
  // -------------------------------------------------------------------------
  console.log("\n[TESTE 4] Consultar vendas com filtros no VendaModel.findAll()");
  const todasVendas = await VendaModel.findAll();
  console.log(`-> Total de vendas no banco: ${todasVendas.length}`);

  const filtradasFinalizadas = await VendaModel.findAll({ status: "finalizada" });
  if (filtradasFinalizadas.some(v => v.status !== "finalizada")) throw new Error("Filtro por status falhou!");

  const filtradasBusca = await VendaModel.findAll({ busca: cliente.nome });
  if (!filtradasBusca.some(v => v.id === vendaId1)) throw new Error("Busca por nome de cliente falhou!");
  console.log("-> ✅ APROVADO: Filtros de status e busca textual validados com sucesso.");

  // -------------------------------------------------------------------------
  // TESTE 5: Cancelar venda e restituição ao estoque
  // -------------------------------------------------------------------------
  console.log("\n[TESTE 5] Cancelamento de venda com estorno de estoque");
  const cancelou = await VendaModel.cancel(vendaId2);
  if (!cancelou) throw new Error("Cancelamento retornou false!");

  const [estPosCancel]: any = await database.execute("SELECT estoque FROM produtos WHERE id = ?", [prodUnit.id]);
  if (estPosCancel[0].estoque !== 1) throw new Error("Estoque deveria ter voltado para 1 após cancelamento!");
  console.log(`-> Estoque devolvido: ${estPosCancel[0].estoque} un.`);
  console.log("-> ✅ APROVADO: Venda cancelada e estoque recomposto na transação.");

  console.log("\n=================================================");
  console.log("  TODOS OS 5 TESTES CRÍTICOS PASSARAM COM SUCESSO!");
  console.log("=================================================");
  process.exit(0);
}

// Exibe falhas da suite e encerra o processo com codigo de erro.
runComprehensiveTests().catch(err => {
  console.error("❌ ERRO NA SUÍTE:", err);
  process.exit(1);
});
