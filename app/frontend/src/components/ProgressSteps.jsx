import { motion } from 'framer-motion'

const getSteps = (deliveryType) => {
    const steps = [
        { id: 1, emoji: '✅', label: 'Order Placed' },
        { id: 2, emoji: '🛒', label: 'Being Prepared' },
        { id: 3, emoji: deliveryType === 'delivery' ? '🚚' : '🎉', label: deliveryType === 'delivery' ? 'Out for Delivery' : 'Ready' },
    ]
    if (deliveryType === 'delivery') {
        steps.push({ id: 4, emoji: '🏠', label: 'Delivered' })
    }
    return steps
}

function getStepState(stepId, status, deliveryType) {
    if (status === 'Delivered') {
        return 'done'
    }
    if (status === 'Ready for Pickup') {
        if (deliveryType === 'delivery') {
            if (stepId <= 2) return 'done'
            if (stepId === 3) return 'active'
            return 'pending'
        } else {
            return stepId <= 3 ? 'done' : 'pending'
        }
    }
    if (status === 'Processing') {
        if (stepId === 1) return 'done'
        if (stepId === 2) return 'active'
        return 'pending'
    }
    // Cancelled
    if (stepId === 1) return 'done'
    return 'pending'
}

export default function ProgressSteps({ status, deliveryType }) {
    const steps = getSteps(deliveryType)

    return (
        <div className="progress-steps">
            {steps.map((step, idx) => {
                const state = getStepState(step.id, status, deliveryType)
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
    )
}
