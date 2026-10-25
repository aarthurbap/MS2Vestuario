-- ========================================================
-- MS² VESTUÁRIO - MIGRAÇÕES E AJUSTES DE BANCO DE DADOS
-- ========================================================

-- 1. Permite que cliente_id na tabela vendas aceite NULL
--    (necessário para vendas balcão com "Consumidor não identificado")
ALTER TABLE `vendas` MODIFY COLUMN `cliente_id` INT UNSIGNED NULL;

-- 2. Garante as formas de pagamento padrão
--    INSERT IGNORE evita duplicar as formas caso a migracao seja executada novamente.
INSERT IGNORE INTO `formas_pagamento` (`id`, `nome`, `ativo`) VALUES
(1, 'Dinheiro', 1),
(2, 'Pix', 1),
(3, 'Cartão de crédito', 1),
(4, 'Cartão de débito', 1),
(5, 'Boleto bancário', 1);

-- 3. Cria a tabela que guarda configurações e filtros de relatórios.
--    Os resultados continuam sendo calculados a partir das vendas atuais; nenhum dado de venda é copiado.
CREATE TABLE IF NOT EXISTS `relatorios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `titulo` VARCHAR(120) NOT NULL,
  `descricao` VARCHAR(500) NULL,
  `tipo` ENUM('vendas', 'produtos', 'pagamentos', 'operadores', 'estoque') NOT NULL,
  `data_inicio` DATE NULL,
  `data_fim` DATE NULL,
  `estoque_minimo` INT UNSIGNED NOT NULL DEFAULT 5,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_relatorios_tipo` (`tipo`),
  KEY `idx_relatorios_criado_em` (`criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
