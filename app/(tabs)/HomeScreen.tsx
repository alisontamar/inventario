import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Entypo, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { Link } from "expo-router";
import { supabase } from "@/constants/supabase"; // Ajusta la ruta según tu estructura
import { Alert, ScrollView , Modal } from "react-native";
import Constants from 'expo-constants';

// Tipos para TypeScript
type LowStockProduct = {
  id: string;
  name: string;
  quantity: number;
};

type DailySales = {
  total: number;
  date: string;
};

type TopProduct = {
  name: string;
  grupo?: string;
  id: string;
  totalSold: number;
  cantidadVendida: number;
  empresa: string;
};

export default function HomeScreen() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [topProduct, setTopProduct] = useState<TopProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener productos con stock bajo
  const fetchLowStockProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, cantidad')
        .lte('cantidad', 3) // Productos con menos de 10 unidades
        .order('cantidad', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(product => ({
        id: product.id,
        name: product.nombre,
        quantity: product.cantidad,
      })) || [];

      setLowStockProducts(formattedData);
    } catch (err) {
      console.error('Error fetching low stock products:', err);
      setError('Error al cargar productos con bajo stock');
    }
  };

  // Función para obtener ventas del día
  const fetchDailySales = async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('ventas')
        .select('total')
        .gte('fecha_venta', start.toISOString())
        .lte('fecha_venta', end.toISOString());

      if (error) throw error;

      const totalSales = data?.reduce((sum, venta) => sum + Number(venta.total), 0) || 0;

      setDailySales({
        total: totalSales,
        date: start.toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Error fetching daily sales:', err);
      setError('Error al cargar ventas del día');
    }
  };

  // Función para obtener el producto más vendido
  const fetchTopProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('vista_productos_mas_vendidos').select("*")

      if (error) throw error;

      setTopProduct({
        name: data[0]?.nombre || 'Sin datos',
        grupo: data[0]?.categoria || 'Sin grupo',
        id: data[0]?.product_id || 'Sin ID',
        empresa: data[0]?.empresa || 'Sin empresa',
        cantidadVendida: data[0]?.cantidad_total_vendida || 0,
        totalSold: data[0]?.ingresos_totales || 0,
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo obtener el producto más vendido");
      setTopProduct({
        name: 'Sin nombre',
        grupo: 'Sin grupo',
        id: 'Sin ID',
        empresa: 'Sin empresa',
        cantidadVendida: 0,
        totalSold: 0,
      });
    }
  };

  // Cargar todos los datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchLowStockProducts(),
          fetchDailySales(),
          fetchTopProduct(),
        ]);
      } catch (err) {
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Función para refrescar datos
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchLowStockProducts(),
      fetchDailySales(),
      fetchTopProduct(),
    ]);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialIcons name="error" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Stocky</Text>
        <TouchableOpacity onPress={refreshData} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={28} color="#2196F3" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.cardContainer}>
        <Card
          icon="trending-up"
          title="Ventas Hoy"
          value={`Bs. ${dailySales?.total.toFixed(2) || '0.00'}`}
          color="#4CAF50"
        />

        <LowStockListCard
          products={lowStockProducts}
          onPressMore={() => setModalVisible(true)}
        />

        <Card
          icon="whatshot"
          title={`Producto más vendido Hoy`}
          value={topProduct?.grupo + ' - ' + topProduct?.name || 'Sin datos'}
          subtitle={`${topProduct?.empresa} - ${topProduct?.cantidadVendida} ${topProduct?.cantidadVendida === 1 ? "cantidad" : "cantidades"} - precio de venta: ${topProduct?.totalSold}`}
          color="#2196F3"
        />
      </ScrollView>

      <Modal
        animationType="slide"
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Productos con bajo stock</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Entypo name="cross" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((item) => (
                  <Text key={item.id} style={styles.stockItem}>
                    • {item.name} ({item.quantity} unidad
                    {item.quantity > 1 ? "es" : ""})
                  </Text>
                ))
              ) : (
                <Text style={styles.noDataText}>No hay productos con bajo stock</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Link href="/modal/register" asChild>
        <TouchableOpacity style={styles.fab}>
          <MaterialCommunityIcons name="microphone" size={24} color="white" />
        </TouchableOpacity>
      </Link>
    </View>
  );
}

type CardProps = {
  icon: any;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
};

function Card({ icon, title, value, subtitle, color }: CardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <MaterialIcons name={icon} size={28} color={color} />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

type LowStockListCardProps = {
  products: LowStockProduct[];
  onPressMore: () => void;
};

function LowStockListCard({ products, onPressMore }: LowStockListCardProps) {
  const visibleItems = products.slice(0, 3); // mostrar máximo 3
  return (
    <View style={[styles.card, { borderLeftColor: "#F44336" }]}>
      <MaterialIcons name="warning" size={28} color="#F44336" />
      <View style={[styles.cardText, { flex: 1 }]}>
        <Text style={styles.cardTitle}>
          Bajo Stock ({products.length} productos)
        </Text>

        {visibleItems.length > 0 ? (
          visibleItems.map((p) => (
            <Text key={p.id} style={styles.stockItem}>
              • {p.name} ({p.quantity} unidad{p.quantity > 1 ? "es" : ""})
            </Text>
          ))
        ) : (
          <Text style={styles.noDataText}>No hay productos con bajo stock</Text>
        )}

        {products.length > 3 && (
          <TouchableOpacity onPress={onPressMore}>
            <Text style={styles.verMas}>Ver más</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#191a26", marginTop: Constants.statusBarHeight },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  header: {
    fontSize: 32,
    marginBottom: 60,
    fontWeight: "bold",
    flex: 1,
    color: "#ffffff",
  },
  refreshButton: {
    padding: 10,
    marginBottom: 60,
  },
  cardContainer: { gap: 15 },
  card: {
    flexDirection: "row",
    backgroundColor: 'rgba(118, 199, 246, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(109, 180, 242, 0.1)',
    elevation: 3,
    alignItems: "flex-start",
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardText: { marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 5, color: "#fff" },
  cardSubtitle: { fontSize: 14, color: "#fff", marginTop: 4 },
  cardValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  stockItem: { fontSize: 15, color: "#fff", marginBottom: 4 },
  verMas: {
    marginTop: 10,
    color: "#1976D2",
    fontWeight: "bold",
    textAlign: "right"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#F44336",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#1976D2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  noDataText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#1976D2",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalList: {
    maxHeight: 400,
  },
});