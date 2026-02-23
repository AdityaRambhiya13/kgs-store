import { motion } from 'framer-motion'

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>

// Dynamic generation of steps based on deliveryType
const getSteps = (deliveryType) => [
    { id: 1, icon: <CheckIcon />, label: 'Order Placed' },
    { id: 2, icon: <PackageIcon />, label: 'Being Prepared' },
    { id: 3, icon: deliveryType === 'delivery' ? <TruckIcon /> : <HomeIcon />, label: deliveryType === 'delivery' ? 'Out for Delivery' : 'Ready' },
]

function getStepState(stepId, status) {
    if (status === 'Ready for Pickup') {
        return stepId <= 3 ? 'done' : 'pending'
    }
    // Processing
    if (stepId === 1) return 'done'
    if (stepId === 2) return 'active'
    return 'pending'
}

export default function ProgressSteps({ status, deliveryType }) {
    const steps = getSteps(deliveryType)

    return (
        <div className="progress-steps-wrapper card" style={{ padding: '24px 16px', margin: '24px 0', width: '100%', textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, marginBottom: 24, color: 'var(--text)' }}>Order Status</h3>
            <div className="progress-steps">
                {steps.map((step, idx) => {
                    const state = getStepState(step.id, status)
                    return (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                            <div className="progress-step">
                                <motion.div
                                    className={`progress-step-circle step-${state}`}
                                    initial={false}
                                    animate={state === 'done' ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 0.4 }}
                                >
                                    {step.icon}
                                </motion.div>
                                <div className="progress-step-label">{step.label}</div>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className="progress-connector" style={{ marginTop: 22 }}>
                                    <motion.div
                                        className="progress-connector-fill"
                                        initial={{ width: '0%' }}
                                        animate={{
                                            width: getStepState(step.id + 1, status) !== 'pending' ? '100%' : '0%'
                                        }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
