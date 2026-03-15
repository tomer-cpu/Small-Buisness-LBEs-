import { useState } from 'react';
import type { ProductType, CurrencyCode } from '../../types';

interface Props {
  product: ProductType | null;
  onSave: (data: Partial<ProductType>) => void;
  onClose: () => void;
  currency: CurrencyCode;
  lang: string;
}

export default function ProductModal({ product, onSave, onClose, lang }: Props) {
  const [sku, setSku] = useState(product?.sku || '');
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [category, setCategory] = useState(product?.category || '');
  const [unitCost, setUnitCost] = useState(product?.unit_cost?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price?.toString() || '');
  const [minOrder, setMinOrder] = useState(product?.min_order_quantity?.toString() || '1');
  const [leadTime, setLeadTime] = useState(product?.lead_time_days?.toString() || '0');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  const isHe = lang === 'he';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return;
    onSave({
      sku: sku.trim(),
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      unit_cost: parseFloat(unitCost) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      min_order_quantity: parseInt(minOrder) || 1,
      lead_time_days: parseInt(leadTime) || 0,
      is_active: isActive,
    });
  };

  const cost = parseFloat(unitCost) || 0;
  const price = parseFloat(sellingPrice) || 0;
  const margin = price > 0 ? ((price - cost) / price * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{product ? (isHe ? 'עריכת מוצר' : 'Edit Product') : (isHe ? 'מוצר חדש' : 'New Product')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>{isHe ? 'מק״ט' : 'SKU'} *</label>
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{isHe ? 'שם מוצר' : 'Product Name'} *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>{isHe ? 'תיאור' : 'Description'}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="form-group">
            <label>{isHe ? 'קטגוריה' : 'Category'}</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{isHe ? 'עלות ייצור ליחידה' : 'Unit Cost'} *</label>
              <input type="number" step="0.01" min="0" value={unitCost}
                onChange={e => setUnitCost(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{isHe ? 'מחיר מכירה' : 'Selling Price'} *</label>
              <input type="number" step="0.01" min="0" value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{isHe ? 'מרווח' : 'Margin'}</label>
              <div className={`margin-preview ${margin >= 50 ? 'high' : margin >= 30 ? 'medium' : 'low'}`}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{isHe ? 'כמות מינימום' : 'Min Order Qty'}</label>
              <input type="number" min="1" value={minOrder}
                onChange={e => setMinOrder(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{isHe ? 'זמן אספקה (ימים)' : 'Lead Time (days)'}</label>
              <input type="number" min="0" value={leadTime}
                onChange={e => setLeadTime(e.target.value)} />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={isActive}
                onChange={e => setIsActive(e.target.checked)} />
              {isHe ? 'מוצר פעיל' : 'Product Active'}
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              {isHe ? 'ביטול' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              {product ? (isHe ? 'שמירה' : 'Save') : (isHe ? 'הוספה' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
