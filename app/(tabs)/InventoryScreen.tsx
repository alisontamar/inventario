import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from "@/constants/supabase";
import BackButton from '../components/BackButton';

// Tipo para los productos
interface Product {
  id: string;
  nombre: string;
  empresa: string | null;
  precio_venta: number | null;
  precio_compra: number | null;
  cantidad: number;
  caracteristicas: string | null;
  grupo: string | null;
  barcode: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export default function InventoryTable() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageUris, setImageUris] = useState<{ [key: string]: string }>({});

  // Función para convertir ArrayBuffer a data URI
  const arrayBufferToDataUri = (buffer: ArrayBuffer, mimeType: string = 'image/jpeg'): string => {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting ArrayBuffer to data URI:', error);
      return createPlaceholderSVG();
    }
  };

  // Función para crear placeholder SVG local
  const createPlaceholderSVG = (width = 80, height = 80, text = "Sin Imagen") => {
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#f0f0f0" stroke="#cccccc" stroke-width="1"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="10" fill="#999999">${text}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Función para procesar imágenes blob (CORREGIDA)
  const processProductImages = async (productsData: Product[]) => {
    const newImageUris: { [key: string]: string } = {};
    
    for (const product of productsData) {
      try {
        console.log(`Procesando imagen para producto ${product.id}:`, {
          hasImageBlob: !!product.imagen_blob,
          imageType: typeof product.imagen_blob,
          imageLength: product.imagen_blob ? product.imagen_blob.byteLength : 0
        });

        if (product.imagen_blob && product.imagen_blob.byteLength > 0) {
          // Intentar diferentes tipos MIME
          const mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
          let imageUri = null;
          
          for (const mimeType of mimeTypes) {
            try {
              imageUri = arrayBufferToDataUri(product.imagen_blob, mimeType);
              if (imageUri) {
                break;
              }
            } catch (error) {
              console.log(`Error con mime type ${mimeType}:`, error);
            }
          }
          
          if (imageUri) {
            newImageUris[product.id] = imageUri;
            console.log(`Imagen procesada exitosamente para producto ${product.id}`);
          } else {
            console.log(`No se pudo procesar imagen para producto ${product.id}`);
            newImageUris[product.id] = createPlaceholderSVG();
          }
        } else {
          console.log(`No hay imagen blob para producto ${product.id}`);
          newImageUris[product.id] = createPlaceholderSVG();
        }
      } catch (error) {
        console.error(`Error procesando imagen para producto ${product.id}:`, error);
        newImageUris[product.id] = createPlaceholderSVG();
      }
    }
    
    console.log('Todas las imágenes procesadas:', Object.keys(newImageUris));
    setImageUris(newImageUris);
  };

  // Función para cargar productos desde Supabase (CORREGIDA)
  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('Cargando productos desde Supabase...');
      
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error cargando productos:', error);
        Alert.alert('Error', 'No se pudieron cargar los productos');
        return;
      }

      console.log(`Cargados ${data?.length || 0} productos`);
      
      const productsData = data || [];
      setProducts(productsData);
      
      // Procesar imágenes después de cargar productos
      await processProductImages(productsData);
      
    } catch (error) {
      console.error('Error general:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar la lista
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter((product) =>
    product.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (product.empresa && product.empresa.toLowerCase().includes(search.toLowerCase())) ||
    (product.grupo && product.grupo.toLowerCase().includes(search.toLowerCase()))
  );
  
  // Función para formatear el precio
  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return `Bs ${price.toFixed(2)}`;
  };

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Componente de imagen con manejo de errores MEJORADO
  const ProductImage = ({ productId }: { productId: string }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const imageUri = imageUris[productId];

    console.log(`Renderizando imagen para producto ${productId}:`, {
      hasImageUri: !!imageUri,
      imageError,
      imageLoading
    });

    // Mostrar placeholder si hay error o no hay imagen
    if (imageError || !imageUri) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>📷</Text>
          <Text style={styles.placeholderSubText}>Sin Imagen</Text>
        </View>
      );
    }

    // Mostrar loading mientras carga
    if (imageLoading) {
      return (
        <View style={styles.placeholderContainer}>
          <ActivityIndicator size="small" color="#1976D2" />
          <Text style={styles.placeholderSubText}>Cargando...</Text>
        </View>
      );
    }

    return (
      <Image 
        source={{ uri: imageUri }} 
        style={styles.image}
        onError={(error) => {
          console.error(`Error cargando imagen para producto ${productId}:`, error);
          setImageError(true);
        }}
        onLoadStart={() => setImageLoading(true)}
        onLoad={() => setImageLoading(false)}
        onLoadEnd={() => setImageLoading(false)}
        resizeMode="cover"
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackButton path='/' label='Volver'/>
      <TextInput
        placeholder="Buscar producto..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        placeholderTextColor="#888"
      />

      <Text style={styles.resultsCount}>
        {filteredProducts.length} producto(s) encontrado(s)
      </Text>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.nombre}</Text>
                <Text style={styles.detail}>
                  Empresa: {item.empresa || 'No especificada'}
                </Text>
                <Text style={styles.detail}>
                  Cantidad: {item.cantidad}
                </Text>
                <Text style={styles.detail}>
                  Precio Venta: {formatPrice(item.precio_venta)}
                </Text>
                <Text style={styles.detail}>
                  Precio Compra: {formatPrice(item.precio_compra)}
                </Text>
              </View>
            </View>

            {/* Indicador de stock bajo */}
            {item.cantidad < 3 && (
              <View style={styles.lowStockIndicator}>
                <Text style={styles.lowStockText}>⚠️ Stock bajo</Text>
              </View>
            )}

            {/* Ver más / menos */}
            <TouchableOpacity onPress={() => toggleExpand(item.id)}>
              <Text style={styles.verMas}>
                {expanded.includes(item.id) ? 'Ver menos' : 'Ver más'}
              </Text>
            </TouchableOpacity>

            {/* Contenido extra */}
            {expanded.includes(item.id) && (
              <View style={styles.extra}>
                <Text style={styles.extraText}>
                  Grupo: {item.grupo || 'No especificado'}
                </Text>
                <Text style={styles.extraText}>
                  Código de barras: {item.barcode || 'No especificado'}
                </Text>
                <Text style={styles.extraText}>
                  Características: {item.caracteristicas || 'No especificadas'}
                </Text>
                <Text style={styles.extraText}>
                  Fecha de creación: {formatDate(item.fecha_creacion)}
                </Text>
                <Text style={styles.extraText}>
                  Última actualización: {formatDate(item.fecha_actualizacion)}
                </Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron productos</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#191a26',
  },
  searchBar: {
    backgroundColor: '#262733',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    color: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // capa translúcida
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
   placeholderContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 24,
    color: '#999',
  },
  placeholderSubText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  detail: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  lowStockIndicator: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  lowStockText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  verMas: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  extra: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  extraText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});