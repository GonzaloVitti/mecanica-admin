import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  image?: string;
  price: number;
  stock: number;
  barcode?: string;
}

interface ProductSearchProps {
  products: Product[];
  onSelect: (productId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  error?: string;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  products,
  onSelect,
  placeholder = 'Buscar productos...',
  disabled = false,
  value = '',
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set selected product when value changes
  useEffect(() => {
    if (value) {
      const product = products.find(p => p.id === value);
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [value, products]);

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    onSelect(product.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedProduct(null);
    onSelect('');
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {selectedProduct ? (
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedProduct.image ? (
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    fill
                    className="object-cover rounded"
                    sizes="40px"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedProduct.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ${selectedProduct.price.toFixed(2)} • {selectedProduct.stock} en stock
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              title="Cambiar producto"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredProducts.length > 0) {
                handleSelect(filteredProducts[0]);
              }
            }}
            disabled={disabled}
          />
        </div>
      )}

      {isOpen && !selectedProduct && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-60 focus:outline-none sm:text-sm">
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              No se encontraron productos
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleSelect(product)}
              >
                {product.image ? (
                  <div className="relative w-8 h-8 flex-shrink-0 mr-3">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover rounded"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>${product.price.toFixed(2)}</span>
                    <span className="mx-1">•</span>
                    <span>{product.stock} en stock</span>
                    {product.barcode && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="font-mono">{product.barcode}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
