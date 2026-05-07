import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder } from '../api'

export default function PrintBillPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await getOrder(token)
                setOrder(data)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchOrder()
    }, [token])

    useEffect(() => {
        if (order) {
            // Wait for images if any (though we don't have any in the bill yet)
            setTimeout(() => {
                window.print()
                // Do NOT navigate back automatically, it might interrupt the print spooler
            }, 1000)
        }
    }, [order])

    if (loading) return <div style={{ padding: 20 }}>Loading Bill...</div>
    if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>
    if (!order) return <div style={{ padding: 20 }}>Order not found</div>

    const items = JSON.parse(order.items_json || '[]')
    const billNo = order.token.replace(/-/g, '').slice(0, 10).toUpperCase()
    const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0)
    const deliveryFee = order.total - subtotal
    const totalQty = items.reduce((s, it) => s + it.quantity, 0)
    const dateStr = new Date(order.created_at || new Date()).toLocaleDateString('en-GB')
    const timeStr = new Date(order.created_at || new Date()).toLocaleTimeString('en-GB', { hour12: false })

    return (
        <>
            <div className="no-print" style={{ padding: '10px', background: '#1e3a8a', color: 'white', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <p style={{ margin: '0 0 10px 0' }}>Bill Preview for #{order.token}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>Reprint</button>
                    <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: 'white', color: '#1e3a8a', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>Back to Admin</button>
                </div>
            </div>

            <div id="print-bill-content">
                <div className="text-center bold store-name">KETAN GENERAL STORES</div>
                <div className="text-center store-addr">G3, G4, Vasant Chamber, Gupte Road,<br/>Dombivali (West) - 421202</div>
                <div className="text-center store-meta">Phone: 8879485171 &nbsp; GSTIN: 27AAAPF9753F2ZP</div>
                
                <div className="sep"></div>
                <div className="text-center bold title">TAX INVOICE</div>
                
                <div className="meta-row">
                    <span>Date : {dateStr}</span>
                    <span>Time : {timeStr}</span>
                </div>
                <div className="meta-line">Bill No : {billNo}</div>
                <div className="meta-line">Billed By : Ketan Furia</div>
                
                <div className="sep"></div>
                
                <div className="table-head">SNO HSN CODE/ITEM NAME</div>
                <div className="table-nums-row">
                    <div className="col-mrp">MRP</div>
                    <div className="col-rate">RATE</div>
                    <div className="col-qty">QTY</div>
                    <div className="col-total">TOTAL</div>
                </div>
                
                <div className="sep"></div>

                {items.map((item, index) => {
                    const mrp = (item.price * 1.1).toFixed(2) 
                    return (
                        <div key={index} className="item-block">
                            <div className="item-name">{index + 1} &nbsp; {item.name}</div>
                            <div className="item-nums">
                                <div className="col-mrp">{mrp}</div>
                                <div className="col-rate">{item.price.toFixed(2)}</div>
                                <div className="col-qty">{item.quantity.toFixed(3)}</div>
                                <div className="col-total">{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                        </div>
                    )
                })}

                {deliveryFee > 0 && (
                    <div className="item-block">
                        <div className="item-name">{items.length + 1} &nbsp; Delivery Charges</div>
                        <div className="item-nums">
                            <div className="col-mrp">{deliveryFee.toFixed(2)}</div>
                            <div className="col-rate">{deliveryFee.toFixed(2)}</div>
                            <div className="col-qty">1.000</div>
                            <div className="col-total">{deliveryFee.toFixed(2)}</div>
                        </div>
                    </div>
                )}

                <div className="sep"></div>
                
                <div className="summary-row">
                    <span>Total :</span>
                    <span className="bold">{order.total.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                    <span>Round Off :</span>
                    <span>0.00</span>
                </div>
                
                <div className="sep-star"></div>
                
                <div className="net-payable">
                    <span>Net Payable :</span>
                    <span>₹{order.total.toFixed(2)}</span>
                </div>
                
                <div className="sep-star"></div>
                
                <div className="footer-info">ITEM(S)/QTY: {items.length}/{totalQty.toFixed(3)}</div>
                
                <div className="sep"></div>
                
                <div className="summary-row">
                    <span>PAYMENT MODE</span>
                    <span className="bold">{order.payment_method?.toUpperCase() || 'CASH'}</span>
                </div>
                
                <div className="sep"></div>
                
                <div className="text-center thank-you">Thank you, Visit again!!!</div>
            </div>

            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #f1f5f9;
                }
                #print-bill-content {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    color: #000;
                    background: #fff;
                    width: 72mm;
                    margin: 0 auto;
                    padding: 5px 2mm 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .text-center { text-align: center; }
                .bold { font-weight: 900; }
                .store-name { font-size: 16px; margin-bottom: 4px; letter-spacing: 0.5px; }
                .store-addr { font-size: 10px; line-height: 1.3; margin-bottom: 4px; }
                .store-meta { font-size: 10px; margin-bottom: 6px; }
                .sep { border-top: 1px dashed #000; margin: 6px 0; }
                .sep-star { border-top: 1px dotted #000; margin: 6px 0; position: relative; height: 1px; }
                .sep-star::after { content: "******************************************"; font-size: 10px; position: absolute; top: -7px; left: 0; width: 100%; overflow: hidden; height: 14px; background: #fff; }
                .title { font-size: 15px; margin: 8px 0; text-decoration: underline; letter-spacing: 2px; }
                .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
                .meta-line { margin-bottom: 4px; font-size: 11px; }
                .table-head { font-size: 11px; font-weight: 900; margin-top: 8px; }
                .table-nums-row { display: flex; font-size: 10px; font-weight: 900; padding: 4px 0; }
                .item-block { margin-bottom: 8px; }
                .item-name { font-size: 11px; margin-bottom: 2px; }
                .item-nums { display: flex; font-size: 11px; }
                .col-mrp   { width: 22%; text-align: left; }
                .col-rate  { width: 22%; text-align: right; }
                .col-qty   { width: 22%; text-align: right; }
                .col-total { width: 34%; text-align: right; }
                .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
                .net-payable { display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; font-weight: 900; }
                .footer-info { font-size: 11px; margin: 8px 0; }
                .thank-you { font-size: 13px; margin-top: 20px; font-weight: 900; letter-spacing: 1px; }

                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; padding: 0; }
                    #print-bill-content {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    @page { size: auto; margin: 0; }
                }
            `}</style>
        </>
    )
}
