import React from 'react';
import { Utensils } from 'lucide-react';
import { formatCurrency } from '../../../utils/calculations';

interface FoodAllowanceCardProps {
    value: number;
    styles: any;
}

export const FoodAllowanceCard: React.FC<FoodAllowanceCardProps> = ({ value, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Utensils className="w-4 h-4" /> Auxilio Alimentacao
            </h3>

            <div className={styles.innerBox}>
                <div className="flex items-center justify-between">
                    <span className={styles.internalTotalLabel}>Valor atual</span>
                    <span className={styles.valueDisplay}>{formatCurrency(value || 0)}</span>
                </div>
            </div>
        </div>
    );
};
