"use client";
import { useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useState, useEffect } from "react";
import DeliveryDatePicker from "../../components/DeliveryDatePicker";
import { useDeliveryAvailability } from "@/app/hooks/useDeliveryAvailability";

interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: "simple" | "grouped" | "external" | "variable";
  status: "draft" | "pending" | "private" | "publish";
  featured: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: "taxable" | "shipping" | "none";
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  backorders: "no" | "notify" | "yes";
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: Dimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: ProductCategory[];
  tags: ProductTag[];
  images: ProductImage[];
  attributes: any[];
  default_attributes: any[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: any[];
}

interface ProductImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
}

interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

interface ProductTag {
  id: number;
  name: string;
  slug: string;
}

interface Dimensions {
  length: string;
  width: string;
  height: string;
}

type bruh = {
  product: Product;
  variations: any;
};

function transformToWooVariation(rawAttributes: any, useGlobalPrefix = false) {
  return Object.entries(rawAttributes).map(([key, value]) => {
    // 1. Clean the Attribute Key
    // If it's a global attribute (e.g. "Size"), WC expects "pa_size"
    let attributeKey = key;
    if (useGlobalPrefix) {
      // "Cantidad" -> "pa_cantidad"
      attributeKey = `pa_${key.toLowerCase().replace(/\s+/g, '-')}`;
    }

    // 2. Clean the Value (Optional but recommended for Global Attributes)
    // Global attributes usually expect the SLUG (e.g. "chocolate-blanco") not the Name ("Chocolate Blanco")
    // Custom attributes (local to product) expect the exact Name string.
    let attributeValue:string = value as string;
    if (useGlobalPrefix) {
      attributeValue = (value as string).toLowerCase().replace(/\s+/g, '-');
    }

    return {
      attribute: attributeKey,
      value: attributeValue
    };
  });
}


export default function ProductDetailsClient({ product, variations }: bruh) {
  const [selectedAttrs, setSelectedAttrs] = useState<{ [key: string]: string }>(
    {}
  );
  const [currentVariation, setCurrentVariation] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [addedSuccess, setAddedSuccess] = useState(false);
  const { data, getDailyRemaining, refresh } = useDeliveryAvailability();
  const router = useRouter();


  // Actualiza la variación actual cuando cambian los selects
  useEffect(() => {
    if (product.type !== "variable") return;

    const match = variations.find((v: any) =>
      v.attributes.every(
        (a: any) =>
          selectedAttrs[a.name] &&
          selectedAttrs[a.name].toLowerCase() === a.option.toLowerCase()
      )
    );

    setCurrentVariation(match || null);
  }, [selectedAttrs, variations, product.type]);

  // Manejador genérico para cada atributo (ej: Tamaño, Sabor)
  const handleSelectChange = (attrName: string, value: string) => {
    setSelectedAttrs((prev) => ({
      ...prev,
      [attrName]: value,
    }));
  };

  // Precio actual
  const currentPrice = currentVariation?.price || product.price || "N/A";

  // Agregar al carrito
  const handleAddToCart = async () => {
    if (product.type === "variable" && !currentVariation) {
      setMessage(
        "⚠️ Debes seleccionar todas las opciones antes de agregar al carrito."
      );
      return false;
    }

    if (quantity < 1) {
      setMessage("⚠️ La cantidad debe ser al menos 1.");
      return false;
    }


    const item = currentVariation || product;
    

    // Obtiene la primera cookie
    const cartRes1 = await fetch("/api/store/cart", { cache: "no-store" });
    const variation = transformToWooVariation(selectedAttrs)

    console.log(variation)

    const addRes = await fetch("/api/store/cart/addItem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id,
                             quantity: quantity,
                             variation: variation,
                          }),
    });

    if (!addRes.ok) throw new Error("Error al agregar al carrito");

    

    // setMessage("✅ Producto añadido al carrito!");
    setAddedSuccess(true);
    return true;
  };

  const handleBuyNow = async () => {
    const res = await handleAddToCart();
    router.push("/cart");
  };

  const areAttributesSelected = product.type !== "variable" || product.attributes.every((attr) => selectedAttrs[attr.name]);
  // 2. Calcular el límite
  const dailyLimit = deliveryDate ? (getDailyRemaining(deliveryDate) ?? 0) : 0;
  const globalLimit = data?.global_remaining ?? 0;


  return (
    <div className="mx-auto">
      {/* TODO: IMPLEMENTAR BREADCRUMBS PARA MANEJO DE CATEGORÍAS */}
      <p>{`Productos > ${product.categories[0].name} > ${product.name}`}</p>
      <div className="grid grid-cols-2">
        <img
          src={currentVariation?.image?.src || product.images[0]?.src}
          alt={product.name}
          className="w-full h-96 mb-6 object-cover"
        />
        <div className="w-full px-24">
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          {/* Mostrar precio */}
          <p className="text-2xl font-semibold mb-6">
            ${(parseFloat(currentPrice) * quantity).toFixed(2)}
          </p>

          <p className="text-gray-700 mb-4">
            {product.description.replace(/<[^>]+>/g, "")}
          </p>

          {/* Si es producto variable, mostrar selects dinámicos */}
          {product.type === "variable" &&
            product.attributes.map((attr: any) => (
              <div key={attr.name} className="mb-4">
                <label className="block mb-2 text-lg font-medium">
                  Selecciona {attr.name.toLowerCase()}:
                </label>
                <select
                  onChange={(e) =>
                    handleSelectChange(attr.name, e.target.value)
                  }
                  value={selectedAttrs[attr.name] || ""}
                  className="border p-3 w-full max-w-sm"
                >
                  <option value="">Selecciona una opción</option>
                  {attr.options.map((opt: string) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}

          {/* ---------------- PASO 3: CANTIDAD ---------------- */}
          {/* Se bloquea si no hay fecha seleccionada o si el cupo es 0 */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <label htmlFor="quantity" className="text-lg font-medium">
                Cantidad:
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                // El maximo es el menor entre el diario y el global
                max={10}
                // Deshabilitado si no hay fecha o si no hay cupo
                // disabled={ maxQuantityAvailable <= 0}
                value={quantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  // Logica de limitacion estricta
                  setQuantity(val);
                }}
                className={`border rounded-lg p-2 w-20 text-center`}
              />
            </div>
            {/* Mensajes de ayuda para el usuario */}
              {/* {deliveryDate && maxQuantityAvailable > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                      Máximo disponible para esta fecha: {maxQuantityAvailable}
                  </p>
              )}
              {deliveryDate && maxQuantityAvailable <= 0 && (
                  <p className="text-sm text-red-500 mt-1">
                      No hay cupo disponible para esta fecha.
                  </p>
              )} */}
            </div>
          {/* TODO: AGREGAR SELECCION DE FECHA */}

          <div className="flex w-[70%] items-stretch justify-between mt-6">
            {/* Botón agregar al carrito */}
            {/* ESTADO 1: Aún no agregado al carrito */}
            {!addedSuccess ? (
              <div className="flex flex-col gap-4">
                {/* Botón Principal: Agregar */}
                <button
                  onClick={handleAddToCart}
                    // disabled={}
                  className="bg-transparent border-[#E985A7] border-2 text-[#E985A7] px-6 py-3 rounded-full w-full font-bold hover:bg-[#E985A7] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar al carrito
                </button>

                {/* Botón Secundario: Comprar ahora (Opcional, si quieres mantenerlo antes de agregar) */}
                <button
                  onClick={handleBuyNow}
                  // disabled={!deliveryDate || maxQuantityAvailable <= 0}
                  className="text-gray-500 underline hover:text-[#E985A7] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  O comprar ahora directamente
                </button>
              </div>
            ) : (
              
              /* ESTADO 2: Producto Agregado con éxito */
              <div className="flex flex-col gap-3 animate-fade-in">
                
                {/* Mensaje de éxito integrado visualmente */}
                <div className="bg-green-100 text-green-700 p-3 rounded-lg text-center mb-2 border border-green-200">
                  ✅ ¡Se ha agregado con éxito al carrito!
                </div>

                {/* Botón 1: Ir al carrito (El botón original transformado) */}
                <button
                  // TODO: Asegúrate de poner aquí la ruta correcta a tu carrito
                  onClick={() => router.push("/cart")} 
                  className="bg-[#E985A7] text-white px-6 py-3 rounded-full w-full font-bold hover:bg-pink-600 transition-colors shadow-md"
                >
                  Ir al carrito
                </button>

                {/* Botón 2: Seguir comprando (Botón nuevo) */}
                <button
                  // TODO: Asegúrate de poner aquí la ruta a tu catálogo
                  onClick={() => router.push('/products')} 
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full w-full font-medium hover:bg-gray-200 transition-colors"
                >
                  Seguir comprando
                </button>
              </div>
            )}

            {/* Manejo de errores (Mensajes que NO son de éxito, ej: 'Falta stock') */}
            {message && !addedSuccess && (
              <div className="mt-4 text-center p-3 rounded bg-yellow-100 text-yellow-700">
                {message}
              </div>
            )}
          </div>
          {/* Mensaje de confirmación */}
          {message && (
            <div
              className={`mt-4 text-center p-3 rounded ${
                message.startsWith("✅")
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
