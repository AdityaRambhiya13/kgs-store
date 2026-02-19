import { motion } from 'framer-motion'

const STEPS = [
    { id: 1, emoji: '✅', label: 'Order Placed' },
    { id: 2, emoji: '🛒', label: 'Being Prepared' },
    { id: 3, emoji: '🎉', label: 'Ready for Pickup' },
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

export default function ProgressSteps({ status }) {
    return (
        <div className="progress-steps">
            {STEPS.map((step, idx) => {
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
                                {step.emoji}
                            </motion.div>
                            <div className="progress-step-label">{step.label}</div>
                        </div>
                        {idx < STEPS.length - 1 && (
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
    )
}
