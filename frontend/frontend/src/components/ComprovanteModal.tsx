import { useState } from "react";
import type { VendaDetalhada } from "../types/venda";
import "./ComprovanteModal.css";

interface ComprovanteModalProps {
    venda: VendaDetalhada | null;
    isOpen: boolean;
    onClose: () => void;
    onNovaVenda?: () => void;
    isPosVenda?: boolean;
}

export function ComprovanteModal({
    venda,
    isOpen,
    onClose,
    onNovaVenda,
    isPosVenda = false
}: ComprovanteModalProps) {
    const [mostrarAvisoFiscal, setMostrarAvisoFiscal] = useState(false);

    if (!isOpen || !venda) return null;

    const formatarMoeda = (valor: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(valor);

    const formatarDataHora = (dataStr: string | Date) => {
        try {
            const d = new Date(dataStr);
            return new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "medium"
            }).format(d);
        } catch {
            return String(dataStr);
        }
    };

    const handleImprimir = () => {
        window.print();
    };

    const handleBaixarPdf = () => {
        window.print();
    };

    const handleNovaVendaClick = () => {
        if (onNovaVenda) {
            onNovaVenda();
        } else {
            onClose();
        }
    };

    const clienteDisplay = venda.clienteNome
        ? `${venda.clienteNome}${venda.clienteCpf ? ` (${venda.clienteCpf})` : ""}`
        : "Consumidor não identificado";

    const operadorDisplay = venda.usuarioNome || `Operador #${venda.usuarioId}`;

    return (
        <div className="comprovante-backdrop" onClick={onClose}>
            <div
                className="comprovante-dialog"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Cabeçalho do modal */}
                <div className="comprovante-header-card">
                    {isPosVenda ? (
                        <>
                            <div className="comprovante-badge-success">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                Operação Concluída
                            </div>
                            <h2>Venda finalizada com sucesso!</h2>
                            <p>
                                Venda <strong>#{String(venda.id).padStart(6, "0")}</strong> no valor de <strong>{formatarMoeda(venda.total)}</strong>
                            </p>
                        </>
                    ) : (
                        <>
                            <h2>Comprovante de Venda</h2>
                            <p>
                                Venda <strong>#{String(venda.id).padStart(6, "0")}</strong> realizada em {formatarDataHora(venda.dataVenda)}
                            </p>
                        </>
                    )}
                </div>

                {/* Corpo com o cupom */}
                <div className="comprovante-body">
                    <div className="cupom-box">
                        <div className="cupom-header">
                            <div className="cupom-logo">MS² VESTUÁRIO</div>
                            <div className="cupom-title">MS² VESTUÁRIO LTDA</div>
                            <div className="cupom-subtitle">CNPJ: 12.345.678/0001-90</div>
                            <div className="cupom-subtitle">Av. Paulista, 1000 — Bela Vista — São Paulo/SP</div>
                            <div className="cupom-subtitle">Tel: (11) 3214-5678</div>
                            <span className="cupom-badge-naofiscal">Comprovante de Venda (Não Fiscal)</span>
                        </div>

                        <div className="cupom-meta">
                            <div className="cupom-meta-row">
                                <span>VENDA: <strong>#{String(venda.id).padStart(6, "0")}</strong></span>
                                <span>STATUS: <strong>{venda.status.toUpperCase()}</strong></span>
                            </div>
                            <div className="cupom-meta-row">
                                <span>DATA/HORA:</span>
                                <span>{formatarDataHora(venda.dataVenda)}</span>
                            </div>
                            <div className="cupom-meta-row">
                                <span>OPERADOR:</span>
                                <span>{operadorDisplay}</span>
                            </div>
                            <div className="cupom-meta-row">
                                <span>CLIENTE:</span>
                                <span>{clienteDisplay}</span>
                            </div>
                        </div>

                        <table className="cupom-itens-table">
                            <thead>
                                <tr>
                                    <th>Item / Descrição</th>
                                    <th className="text-right">Qtd</th>
                                    <th className="text-right">Unit (R$)</th>
                                    <th className="text-right">Total (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {venda.itens.map((it, idx) => (
                                    <tr key={it.id || idx}>
                                        <td>
                                            <strong>{it.produtoNome}</strong>
                                            <div style={{ fontSize: "10px", color: "#6b7280" }}>{it.produtoCodigo}</div>
                                        </td>
                                        <td className="text-right">{it.quantidade}</td>
                                        <td className="text-right">{it.precoUnitario.toFixed(2)}</td>
                                        <td className="text-right">{((it.subtotalItem ?? (it.quantidade * it.precoUnitario))).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="cupom-totais">
                            <div className="cupom-totais-row">
                                <span>Subtotal:</span>
                                <span>{formatarMoeda(venda.subtotal)}</span>
                            </div>
                            {venda.desconto > 0 && (
                                <div className="cupom-totais-row" style={{ color: "#b91c1c" }}>
                                    <span>Desconto aplicado:</span>
                                    <span>- {formatarMoeda(venda.desconto)}</span>
                                </div>
                            )}
                            <div className="cupom-totais-row is-total">
                                <span>TOTAL DA COMPRA:</span>
                                <span>{formatarMoeda(venda.total)}</span>
                            </div>
                        </div>

                        <div className="cupom-pagamento">
                            <strong>PAGAMENTO:</strong>
                            {venda.pagamentos && venda.pagamentos.length > 0 ? (
                                venda.pagamentos.map((pag, idx) => (
                                    <div key={pag.id || idx} className="cupom-totais-row">
                                        <span>{pag.formaPagamentoNome}:</span>
                                        <span>{formatarMoeda(pag.valor)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="cupom-totais-row">
                                    <span>Forma utilizada:</span>
                                    <span>{venda.formasPagamento || "Dinheiro"} ({formatarMoeda(venda.total)})</span>
                                </div>
                            )}
                        </div>

                        <div className="cupom-footer">
                            <div>Obrigado pela preferência! Volte sempre!</div>
                            <div style={{ marginTop: "4px" }}>MS² Vestuário — Sistema ERP/PDV</div>
                            <div className="cupom-legal-note">
                                ESTE COMPROVANTE NÃO POSSUI VALOR FISCAL E NÃO SUBSTITUI O DOCUMENTO FISCAL OFICIAL (NFC-e / NF-e).
                            </div>
                        </div>
                    </div>

                    {mostrarAvisoFiscal && (
                        <div className="fiscal-aviso-card">
                            <strong>Emissão Fiscal (NFC-e / SEFAZ)</strong>
                            A emissão de Nota Fiscal de Consumidor Eletrônica oficial exige certificado digital A1/A3, credenciamento junto à SEFAZ do seu estado e configuração de CSC. Para proteger seu estabelecimento, o sistema não emite documentos fiscais simulados. O módulo fiscal está estruturado e aguarda a configuração das credenciais tributárias.
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className="comprovante-actions">
                    <button
                        type="button"
                        className="comp-btn comp-btn-primary"
                        onClick={handleImprimir}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Imprimir comprovante
                    </button>

                    <button
                        type="button"
                        className="comp-btn comp-btn-secondary"
                        onClick={handleBaixarPdf}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Baixar em PDF
                    </button>

                    <button
                        type="button"
                        className="comp-btn comp-btn-fiscal"
                        onClick={() => setMostrarAvisoFiscal(!mostrarAvisoFiscal)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="9" y1="9" x2="15" y2="9"/>
                            <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        Emitir nota fiscal
                    </button>

                    <button
                        type="button"
                        className="comp-btn comp-btn-outline"
                        onClick={handleNovaVendaClick}
                    >
                        {isPosVenda ? "+ Nova venda" : "Fechar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

