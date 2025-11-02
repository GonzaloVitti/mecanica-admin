'use client'
import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { fetchApi } from '@/app/lib/data';

// Interfaces
interface Branch {
  id: number;
  name: string;
}

interface ProductInventory {
  id: string;
  name: string;
  description: string;
  barcode: string;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  bulk_purchase_price?: number;
  bulk_sale_price?: number;
  bulk_quantity: number;
  current_retock_price: number; // Note: typo in backend, keeping for compatibility
  profit_margin: number;
  wholesale_margin: number;
  category: {
    id: string;
    name: string;
    description: string;
  };
  category_name: string;
  image?: string;
  is_active: boolean;
  minimum_stock: number;
  reorder_point: number;
  maximum_stock: number;
  stock_alert_threshold: number;
  promotional_price?: number;
  is_promotion_active: boolean;
  promotion_start_date?: string;
  promotion_end_date?: string;
  // Inventory fields from the endpoint
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  needs_restock: boolean;
  stock_status: string;
  stock_percentage: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

interface BulkTransferItem {
  product: string; // Changed to string to match UUID from API
  name: string; // Changed from product_name
  barcode?: string; // Changed from product_code, made optional
  branch: number;
  branch_name: string;
  current_stock: number;
  quantity: number;
}

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

const BulkTransferModal: React.FC<BulkTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFromBranch, setSelectedFromBranch] = useState<number | null>(null);
  const [selectedToBranch, setSelectedToBranch] = useState<number | null>(null);
  const [transferItems, setTransferItems] = useState<BulkTransferItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const response = await fetchApi<Branch[]>('/api/branches/public/');
      if (response) {
        // Ensure response is an array
        const branchesArray = Array.isArray(response) ? response : [];
        setBranches(branchesArray);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]); // Set empty array on error
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las sucursales disponibles.'
      });
    }
  };

  // Fetch products by branch
  const fetchProducts = async (branchId: number) => {
    console.log('Fetching products for branch:', branchId);
    try {
      const response = await fetchApi(`/api/featured-section-products/with_stock_by_branch/?branch_id=${branchId}`) as any;
      console.log('Products response:', response);
      if (response) {
        // Response has pagination structure with results array
        const productsArray = response.results || [];
        // Filtrar productos con stock mayor a 0
        const productsWithStock = productsArray.filter((product: ProductInventory) => product.current_stock > 0);
        console.log('Products array with stock > 0:', productsWithStock);
        setProducts(productsWithStock);
        setFilteredProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Set empty arrays on error
      setProducts([]);
      setFilteredProducts([]);
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los productos.'
      });
    }
  };

  // Filter products based on search term
  useEffect(() => {
    // Ensure products is always an array before filtering
    const productsArray = Array.isArray(products) ? products : [];
    console.log('Filtering products. Search term:', searchTerm);
    console.log('Products array length:', productsArray.length);
    console.log('First product sample:', productsArray[0]);
    
    if (!searchTerm.trim()) {
      setFilteredProducts(productsArray);
    } else {
      const filtered = productsArray.filter(product => {
        // Ensure product and product.name exist before calling toLowerCase
        const productName = product?.name || '';
        const productBarcode = product?.barcode || '';
        
        console.log('Filtering product:', {
          id: product.id,
          name: productName,
          barcode: productBarcode,
          searchTerm: searchTerm.toLowerCase(),
          nameMatch: productName.toLowerCase().includes(searchTerm.toLowerCase()),
          barcodeMatch: productBarcode.toLowerCase().includes(searchTerm.toLowerCase())
        });
        
        return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               productBarcode.toLowerCase().includes(searchTerm.toLowerCase());
      });
      console.log('Filtered products count:', filtered.length);
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Fetch products when from branch changes
  useEffect(() => {
    if (selectedFromBranch) {
      fetchProducts(selectedFromBranch);
      setTransferItems([]); // Clear transfer items when branch changes
    }
  }, [selectedFromBranch]);

  // Fetch branches when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBranches();
    }
  }, [isOpen]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Add product to transfer list
  const addProductToTransfer = (product: ProductInventory) => {
    console.log('Adding product to transfer:', {
      productId: product.id,
      productIdType: typeof product.id,
      productName: product.name,
      barcode: product.barcode
    });
    
    // Use product.id as string since API returns UUID string id
    const existingItem = transferItems.find(item => item.product === product.id);
    if (existingItem) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Producto ya agregado',
        message: 'Este producto ya está en la lista de transferencia.'
      });
      return;
    }

    const newItem: BulkTransferItem = {
      product: product.id, // Keep as string UUID
      name: product.name,
      barcode: product.barcode,
      branch: (product as any).branch || selectedFromBranch || 0, // Use selectedFromBranch as fallback
      branch_name: (product as any).branch_name || '', // Use empty string as fallback
      current_stock: product.current_stock, // Use current_stock field from API
      quantity: 1
    };

    console.log('New transfer item created:', newItem);
    setTransferItems(prev => [...prev, newItem]);
  };

  // Remove product from transfer list
  const removeProductFromTransfer = (productId: string) => {
    setTransferItems(prev => prev.filter(item => item.product !== productId));
  };

  // Update quantity for a specific item
  const updateQuantity = (productId: string, quantity: number) => {
    console.log('updateQuantity called:', {
      productId,
      requestedQuantity: quantity,
      transferItemsLength: transferItems.length
    });
    
    setTransferItems(prev => {
      const updated = prev.map(item => {
        if (item.product === productId) {
          const newQuantity = Math.max(0, Math.min(quantity, item.current_stock));
          console.log('Updating item:', {
            productId: item.product,
            productName: item.name,
            oldQuantity: item.quantity,
            requestedQuantity: quantity,
            newQuantity,
            currentStock: item.current_stock,
            barcode: item.barcode
          });
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      
      console.log('Transfer items after update:', updated);
      return updated;
    });
  };

  // Clear all transfer items
  const clearAllItems = () => {
    setTransferItems([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Check if source branch is selected
    if (!selectedFromBranch) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error de validación',
        message: 'Debe seleccionar una sucursal de origen.'
      });
      return;
    }

    // Validation: Check if destination branch is selected
    if (!selectedToBranch) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error de validación',
        message: 'Debe seleccionar una sucursal de destino.'
      });
      return;
    }

    // Validation: Check if branches are different
    if (selectedFromBranch === selectedToBranch) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error de validación',
        message: 'La sucursal de origen debe ser diferente a la sucursal de destino.'
      });
      return;
    }

    // Validation: Check if at least one product has quantity > 0
    const itemsWithQuantity = transferItems.filter(item => item.quantity > 0);
    if (itemsWithQuantity.length === 0) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error de validación',
        message: 'Debe agregar al menos un producto con cantidad mayor a 0.'
      });
      return;
    }

    // Validation: Check if any quantity exceeds available stock
     const invalidItems = itemsWithQuantity.filter(item => item.quantity > item.current_stock);
     if (invalidItems.length > 0) {
       setAlert({
         show: true,
         type: 'error',
         title: 'Error de validación',
         message: `Las siguientes cantidades exceden el stock disponible: ${invalidItems.map(item => item.name).join(', ')}`
       });
       return;
     }

    setLoading(true);
    try {
      const transferData = {
        from_branch: selectedFromBranch,
        to_branch: selectedToBranch,
        notes: notes.trim() || undefined,
        items: itemsWithQuantity.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: 1.00 // Using 1.00 as default unit price since backend requires > 0
        }))
      };

      const response = await fetchApi('/api/bulk-stock-transfers/', {
        method: 'POST',
        body: transferData
      });

      if (response) {
        setAlert({
          show: true,
          type: 'success',
          title: 'Transferencia creada',
          message: `Se ha creado la transferencia masiva con ${itemsWithQuantity.length} productos. Total de unidades: ${itemsWithQuantity.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}`
        });
        
        // Reset form
        setSelectedFromBranch(null);
        setSelectedToBranch(null);
        setNotes('');
        setTransferItems([]);
        setSearchTerm('');
        setProducts([]);
        setFilteredProducts([]);
        
        // Call success callback and close modal after a delay
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('Error creating bulk transfer:', error);
      
      // Handle specific API errors
      let errorMessage = 'No se pudo crear la transferencia masiva. Intente nuevamente.';
      
      // Type guard to check if error has the expected structure
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: unknown } };
        if (apiError.response?.data) {
          const errorData = apiError.response.data;
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData && typeof errorData === 'object') {
            if ('detail' in errorData && typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if ('error' in errorData && typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if ('non_field_errors' in errorData && Array.isArray(errorData.non_field_errors)) {
              errorMessage = errorData.non_field_errors.join(', ');
            } else if ('items' in errorData) {
              errorMessage = 'Error en los productos: ' + JSON.stringify(errorData.items);
            }
          }
        }
      }
      
      setAlert({
        show: true,
        type: 'error',
        title: 'Error al crear transferencia',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-hide alerts
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (alert.show) {
      timeoutId = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
    }
    return () => clearTimeout(timeoutId);
  }, [alert.show]);

  if (!isOpen) return null;

  const totalItems = transferItems.length;
  const totalQuantity = transferItems.reduce((sum, item) => sum + item.quantity, 0);
  const availableBranches = Array.isArray(branches) ? branches.filter(branch => branch.id !== selectedFromBranch) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transferencia Masiva de Stock
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Busque y seleccione productos para transferir entre sucursales.
          </p>
        </div>

        {/* Alert */}
        {alert.show && (
          <div className={`mx-6 mt-4 p-4 rounded-lg ${
            alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            alert.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-yellow-50 border border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {alert.type === 'success' && <CheckCircle className="h-5 w-5" />}
                {alert.type === 'error' && <AlertCircle className="h-5 w-5" />}
                {alert.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">{alert.title}</h3>
                <p className="mt-1 text-sm">{alert.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          {/* Form fields */}
          <div className="px-6 py-4 space-y-4">
            {/* Branch selections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sucursal de origen *
                </label>
                <select
                  value={selectedFromBranch || ''}
                  onChange={(e) => setSelectedFromBranch(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccione sucursal de origen</option>
                  {Array.isArray(branches) && branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sucursal de destino *
                </label>
                <select
                  value={selectedToBranch || ''}
                  onChange={(e) => setSelectedToBranch(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!selectedFromBranch}
                >
                  <option value="">Seleccione sucursal de destino</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product search */}
            {selectedFromBranch && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar productos
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Buscar por nombre o código de producto..."
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingrese notas adicionales sobre la transferencia..."
              />
            </div>
          </div>

          {/* Content area with two columns */}
          <div className="flex-1 overflow-hidden flex">
            {/* Left column: Available products */}
            {selectedFromBranch && (
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white">Productos disponibles</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Array.isArray(filteredProducts) ? filteredProducts.length : 0} productos encontrados
                  </p>
                </div>
                <div className="overflow-y-auto h-64">
                  {!Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredProducts.map((product) => (
                        <div key={product.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                                {product.name || 'Sin nombre'} (ID: {product.id})
                              </h5>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Stock: {(product.current_stock || 0).toLocaleString()}
                              </p>
                              {product.barcode && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Código: {product.barcode}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => addProductToTransfer(product)}
                              className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title="Agregar a transferencia"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right column: Transfer items */}
            <div className={selectedFromBranch ? 'w-1/2' : 'w-full'}>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Productos a transferir</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {totalItems} productos • {totalQuantity.toLocaleString()} unidades
                  </p>
                </div>
                {transferItems.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllItems}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Limpiar todo"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
              <div className="overflow-y-auto h-64">
                {transferItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {selectedFromBranch ? 'Agregue productos desde la lista de la izquierda' : 'Seleccione una sucursal de origen para comenzar'}
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                     {transferItems.map((item) => (
                       <div key={item.product} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                         <div className="flex items-start justify-between">
                           <div className="flex-1">
                             <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                               {item.name}
                             </h5>
                             <p className="text-xs text-gray-600 dark:text-gray-400">
                               Código: {item.barcode || 'N/A'} • Disponible: {item.current_stock.toLocaleString()}
                             </p>
                           </div>
                           <button
                             type="button"
                             onClick={() => removeProductFromTransfer(item.product)}
                             className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                             title="Remover de transferencia"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, Math.max(1, item.quantity - 1))}
                            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.current_stock}
                            value={item.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              console.log('Input onChange triggered:', {
                                productId: item.product,
                                productName: item.name,
                                inputValue: value,
                                currentQuantity: item.quantity,
                                currentStock: item.current_stock,
                                barcode: item.barcode
                              });
                              
                              // Allow empty string for editing, otherwise parse as number
                              if (value === '') {
                                console.log('Empty value detected, setting quantity to 0 temporarily');
                                // Temporarily allow empty for editing
                                setTransferItems(prev => prev.map(transferItem => 
                                  transferItem.product === item.product 
                                    ? { ...transferItem, quantity: 0 }
                                    : transferItem
                                ));
                              } else {
                                const numValue = parseInt(value);
                                console.log('Parsed number value:', numValue, 'isNaN:', isNaN(numValue), 'numValue >= 1:', numValue >= 1);
                                if (!isNaN(numValue) && numValue >= 1) {
                                  console.log('Calling updateQuantity with:', item.product, numValue);
                                  updateQuantity(item.product, numValue);
                                } else {
                                  console.log('Value rejected - not a valid number >= 1');
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              console.log('Input onBlur triggered:', {
                                productId: item.product,
                                blurValue: e.target.value,
                                parsedValue: value,
                                finalValue: Math.max(1, value)
                              });
                              // Ensure minimum value of 1 when losing focus
                              updateQuantity(item.product, Math.max(1, value));
                            }}
                            onFocus={(e) => {
                              console.log('Input onFocus triggered:', {
                                productId: item.product,
                                productName: item.name,
                                currentValue: e.target.value,
                                barcode: item.barcode
                              });
                            }}
                            onKeyDown={(e) => {
                              console.log('Input onKeyDown triggered:', {
                                productId: item.product,
                                key: e.key,
                                keyCode: e.keyCode,
                                currentValue: e.currentTarget.value
                              });
                            }}
                            className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, Math.min(item.current_stock, item.quantity + 1))}
                            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product, item.current_stock)}
                            className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Máx
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {totalItems > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{totalItems}</span> productos • 
                  <span className="font-medium">{totalQuantity.toLocaleString()}</span> unidades totales
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || totalItems === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {loading ? 'Creando...' : 'Crear Transferencia'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkTransferModal;