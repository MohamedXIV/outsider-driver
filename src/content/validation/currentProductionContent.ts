import { productionContent } from '../production/ProductionContent';
import { validateProductionContent } from './ProductionContentValidator';

export function validateCurrentProductionContent() {
  return validateProductionContent(productionContent);
}
