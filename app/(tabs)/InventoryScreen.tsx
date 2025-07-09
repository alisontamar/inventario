import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from "@/constants/supabase";

// Tipo para los productos
interface Product {
  id: string;
  nombre: string;
  empresa: string | null;
  precio_venta: number | null;
  precio_compra: number | null;
  cantidad: number;
  imagen_url: string | null;
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

  // Función para cargar productos desde Supabase
  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error cargando productos:', error);
        Alert.alert('Error', 'No se pudieron cargar los productos');
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
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

  // Función para obtener imagen por defecto
  const getDefaultImage = () => {
    return 'https://via.placeholder.com/80x80/cccccc/666666?text=Sin+Imagen';
  };

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
      <TextInput
        placeholder="Buscar producto..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
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
              <Image 
                source={{ uri: item.imagen_url || getDefaultImage() }} 
                style={styles.image}
                defaultSource={{ uri: getDefaultImage() }}
              />
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
                  grupo: {item.grupo || 'No especificada'}
                </Text>
                <Text style={styles.extraText}>
                  Código de Barras: {item.barcode || 'No especificado'}
                </Text>
                <Text style={styles.extraText}>
                  Fecha de Creación: {formatDate(item.fecha_creacion)}
                </Text>
                <Text style={styles.extraText}>
                  Última Actualización: {formatDate(item.fecha_actualizacion)}
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
    color: '#000',
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
    color: '#fff',
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