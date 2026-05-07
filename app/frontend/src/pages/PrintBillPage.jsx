import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PrintBillPage() {
    const navigate = useNavigate()
    const billHtml = localStorage.getItem('print_bill_html')

    useEffect(() => {
        if (!billHtml) {
            navigate('/manage-store-99')
            return
        }

        // Wait a tiny bit for the DOM to settle, then open print dialog
        const timer = setTimeout(() => {
            window.print()
        }, 800)

        return () => {
            clearTimeout(timer)
        }
    }, [billHtml, navigate])

    if (!billHtml) return null

    return (
        <div style={{ background: 'white', minHeight: '100vh', width: '100%' }}>
            <style>
                {`
                    body { margin: 0; padding: 0; background: white; font-family: 'Courier New', Courier, monospace; }
                    #print-bill-content {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 12px;
                        color: #000;
                        background: #fff;
                        width: 72mm;
                        margin: 0 auto;
                        padding: 5px 2mm 20px;
                    }
                    #print-bill-content .text-center { text-align: center; }
                    #print-bill-content .bold { font-weight: 900; }
                    #print-bill-content .store-name { font-size: 16px; margin-bottom: 4px; letter-spacing: 0.5px; }
                    #print-bill-content .store-addr { font-size: 10px; line-height: 1.3; margin-bottom: 4px; }
                    #print-bill-content .store-meta { font-size: 10px; margin-bottom: 6px; }
                    #print-bill-content .sep { border-top: 1px dashed #000; margin: 6px 0; }
                    #print-bill-content .sep-star { border-top: 1px dotted #000; margin: 6px 0; position: relative; height: 1px; }
                    #print-bill-content .sep-star::after { content: "******************************************"; font-size: 10px; position: absolute; top: -7px; left: 0; width: 100%; overflow: hidden; height: 14px; background: #fff; }
                    #print-bill-content .title { font-size: 15px; margin: 8px 0; text-decoration: underline; letter-spacing: 2px; }
                    #print-bill-content .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
                    #print-bill-content .meta-line { margin-bottom: 4px; font-size: 11px; }
                    #print-bill-content .table-head { font-size: 11px; font-weight: 900; margin-top: 8px; }
                    #print-bill-content .table-nums-row { display: flex; font-size: 10px; font-weight: 900; padding: 4px 0; }
                    #print-bill-content .item-block { margin-bottom: 8px; }
                    #print-bill-content .item-name { font-size: 11px; margin-bottom: 2px; }
                    #print-bill-content .item-nums { display: flex; font-size: 11px; }
                    #print-bill-content .col-mrp   { width: 22%; text-align: left; }
                    #print-bill-content .col-rate  { width: 22%; text-align: right; }
                    #print-bill-content .col-qty   { width: 22%; text-align: right; }
                    #print-bill-content .col-total { width: 34%; text-align: right; }
                    #print-bill-content .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
                    #print-bill-content .net-payable { display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; font-weight: 900; }
                    #print-bill-content .footer-info { font-size: 11px; margin: 8px 0; }
                    #print-bill-content .thank-you { font-size: 13px; margin-top: 20px; font-weight: 900; letter-spacing: 1px; }
                    @media print {
                        @page { size: auto; margin: 0mm; }
                        .no-print { display: none !important; }
                    }
                `}
            </style>
            
            <div className="no-print" style={{ padding: 16, background: '#1e3a8a', color: 'white', textAlign: 'center', marginBottom: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>Print Now</button>
                <button onClick={() => navigate('/manage-store-99')} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold' }}>Back</button>
            </div>
            
            <div dangerouslySetInnerHTML={{ __html: billHtml }} />
        </div>
    )
}
