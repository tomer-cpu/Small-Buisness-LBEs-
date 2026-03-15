import { useEffect, useState } from 'react';
import { Product } from '../sdk-client/base44-client';
import { formatAmount, getMarginPercent } from '../utils/financial';
import ProductModal from '../components/products/ProductModal';
import type { ProductType, CurrencyCode } from '../types';

interface Props {
  currency: CurrencyCode;
  lang: string;
}

export default function Products({ currency, lang }: Props) {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isHe = lang === 'he';

  useEffect(() => {
    Product.list().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (data: Partial<ProductType>) => {
    if (editingProduct) {
      const updated = await Product.update(editingProduct.id, data);
      setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
    } else {
      const created = await Product.create(data);
      setProducts([...products, created]);
    }
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id: string) => {
    const msg = isHe ? 'האם למחוק מוצר זה?' : 'Delete this product?';
    if (!window.confirm(msg)) return;
    await Product.delete(id);
    setProducts(products.filter(p => p.id !== id));
  };

  const handleEdit = (product: ProductType) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const filteredProducts = products.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term);
    }
    return true;
  });

  if (loading) return <div className="loading">{isHe ? 'טוען...' : 'Loading...'}</div>;

  return (
    <div className="products-page">
      <div className="page-header">
        <h1>{isHe ? 'קטלוג מוצרים' : 'Product Catalog'}</h1>
        <button className="btn btn-primary" onClick={handleAdd}>
          + {isHe ? 'מוצר חדש' : 'New Product'}
        </button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder={isHe ? 'חיפוש לפי מק״ט, שם...' : 'Search by SKU, name...'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">{isHe ? 'כל הקטגוריות' : 'All Categories'}</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p>{isHe ? 'אין מוצרים להצגה' : 'No products to display'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isHe ? 'מק״ט' : 'SKU'}</th>
                <th>{isHe ? 'שם מוצר' : 'Product Name'}</th>
                <th>{isHe ? 'קטגוריה' : 'Category'}</th>
                <th>{isHe ? 'עלות ייצור' : 'Unit Cost'}</th>
                <th>{isHe ? 'מחיר מכירה' : 'Selling Price'}</th>
                <th>{isHe ? 'מרווח' : 'Margin'}</th>
                <th>{isHe ? 'סטטוס' : 'Status'}</th>
                <th>{isHe ? 'פעולות' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const margin = getMarginPercent(
                  product.selling_price,
                  product.unit_cost
                );
                return (
                  <tr key={product.id} className={!product.is_active ? 'inactive-row' : ''}>
                    <td className="mono">{product.sku}</td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      {product.description && (
                        <div className="product-desc">{product.description}</div>
                      )}
                    </td>
                    <td><span className="category-badge">{product.category || '-'}</span></td>
                    <td className="amount">{formatAmount(product.unit_cost, currency)}</td>
                    <td className="amount">{formatAmount(product.selling_price, currency)}</td>
                    <td>
                      <span className={`margin-badge ${margin >= 50 ? 'high' : margin >= 30 ? 'medium' : 'low'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                        {product.is_active
                          ? (isHe ? 'פעיל' : 'Active')
                          : (isHe ? 'לא פעיל' : 'Inactive')
                        }
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn-sm" onClick={() => handleEdit(product)}>
                        {isHe ? 'עריכה' : 'Edit'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(product.id)}>
                        {isHe ? 'מחיקה' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          currency={currency}
          lang={lang}
        />
      )}
    </div>
  );
}
