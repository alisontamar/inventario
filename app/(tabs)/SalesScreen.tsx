import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "@/constants/supabase";
import BackButton from "@/app/components/BackButton";

// Tipo para las ventas
interface Sale {
  id: string;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_venta: number;
  total: number;
  fecha_venta: string;
  notas: string | null;
  // Datos del producto relacionado (si existe)
  productos?: {
    caracteristicas: string | null;
    grupo: string | null;
    empresa: string | null;
  };
}

export default function SalesScreen() {
  const [query, setQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState('hoy'); // Por defecto "hoy"
  const [expanded, setExpanded] = useState<string[]>([]);

  // Estados para manejo de datos
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Períodos predefinidos
  const periods = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'ayer', label: 'Ayer' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes', label: 'Este mes' }
  ];

  // Función para formatear la fecha actual
  const formatCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Función corregida para obtener el rango de fechas según el período seleccionado
  const getDateRange = (period: string) => {
    const now = new Date();

    switch (period) {
      case 'hoy':
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { start: startOfToday, end: endOfToday };

      case 'ayer':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        return { start: startOfYesterday, end: endOfYesterday };

      case 'semana':
        const startOfWeek = new Date(now);
        const dayOfWeek = startOfWeek.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes como primer día
        startOfWeek.setDate(startOfWeek.getDate() - diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };

      case 'mes':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };

      default:
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { start: defaultStart, end: defaultEnd };
    }
  };

  // Función para cargar ventas desde Supabase
  const loadSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          productos (
            caracteristicas,
            grupo,
            empresa
          )
        `)
        .order('fecha_venta', { ascending: false });

      if (error) {
        console.error('Error cargando ventas:', error);
        Alert.alert('Error', 'No se pudieron cargar las ventas');
      } else {
        setSales(data || []);
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
    await loadSales();
    setRefreshing(false);
  };

  // Cargar ventas al montar el componente
  useEffect(() => {
    loadSales();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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

  // Función para verificar si una fecha está en el rango (corregida)
  const isDateInRange = (dateString: string, start: Date, end: Date) => {
    const itemDate = new Date(dateString);

    // Crear fechas solo con año, mes y día para comparación
    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return itemDateOnly >= startDateOnly && itemDateOnly <= endDateOnly;
  };

  // Filtrado corregido
  const filteredSales = sales
    .filter((item) => {
      const matchName = item.nombre_producto.toLowerCase().includes(query.toLowerCase());
      const matchFeature = item.productos?.caracteristicas?.toLowerCase().includes(query.toLowerCase()) || false;
      const matchCategory = item.productos?.grupo?.toLowerCase().includes(query.toLowerCase()) || false;
      const matchCompany = item.productos?.empresa?.toLowerCase().includes(query.toLowerCase()) || false;
      const matchesText = matchName || matchFeature || matchCategory || matchCompany;

      const { start, end } = getDateRange(selectedPeriod);
      const matchDate = isDateInRange(item.fecha_venta, start, end);

      return matchesText && matchDate;
    })

  // Calcular productos con alta demanda SOLO de las ventas filtradas
  const ventasPorProducto: Record<string, number> = {};
  filteredSales.forEach((v) => {
    ventasPorProducto[v.nombre_producto] =
      (ventasPorProducto[v.nombre_producto] || 0) + v.cantidad;
  });

  const productosConDemandaAlta = Object.entries(ventasPorProducto)
    .filter(([, cantidad]) => cantidad >= 5)
    .map(([nombre]) => nombre);

  const clearFilters = () => {
    setQuery('');
    setSelectedPeriod('hoy');
    setExpanded([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Cargando ventas...</Text>
      </View>
    );
  }
  const groupSalesByProduct = (salesList: Sale[]) => {
    const grouped: Record<string, Sale> = {};

    salesList.forEach((sale) => {
      const key = sale.producto_id || sale.nombre_producto;

      if (!grouped[key]) {
        grouped[key] = { ...sale };
      } else {
        grouped[key].cantidad += sale.cantidad;
        grouped[key].total += sale.total;
        grouped[key].precio_venta += sale.precio_venta; // Opcional: puedes dividir luego si quieres el promedio
      }
    });

    // Opcional: para que el precio promedio tenga más sentido
    Object.values(grouped).forEach(sale => {
      sale.precio_venta = sale.total / sale.cantidad;
    });

    return Object.values(grouped);
  };

  const groupedSalesArray = groupSalesByProduct(filteredSales);

  return (
    <View style={styles.container}>
      <BackButton path='/' label='Volver' />
      {/* Filtros */}
      <TextInput
        style={styles.search}
        placeholder="Buscar por nombre, característica, grupo"
        value={query}
        onChangeText={setQuery}
        placeholderTextColor="#888"
      />

      <View style={styles.dateFilters}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            onPress={() => setSelectedPeriod(period.key)}
            style={[
              styles.dateButton,
              selectedPeriod === period.key && styles.selectedButton
            ]}
          >
            <Text style={[
              styles.buttonText,
              selectedPeriod === period.key && styles.selectedButtonText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={clearFilters}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.resultsCount}>
        {filteredSales.length} venta(s) encontrada(s) - {periods.find(p => p.key === selectedPeriod)?.label}
      </Text>

      {/* Lista de tarjetas de ventas */}
      <FlatList
        data={groupedSalesArray}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.nombre_producto}</Text>
                <Text style={styles.detail}>
                  Cantidad: {item.cantidad}
                </Text>
                <Text style={styles.detail}>
                  Fecha: {formatDate(item.fecha_venta)}
                </Text>
                <Text style={styles.detail}>
                  Precio: Bs {item.precio_venta.toFixed(2)}
                </Text>
                <Text style={styles.detail}>
                  Total: Bs {item.total.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => toggleExpand(item.id)}>
              <Text style={styles.verMas}>
                {expanded.includes(item.id) ? "Ver menos" : "Ver más"}
              </Text>
            </TouchableOpacity>

            {expanded.includes(item.id) && (
              <View style={styles.extra}>
                <Text style={styles.extraText}>
                  Grupo: {item.productos?.grupo || 'No especificada'}
                </Text>
                <Text style={styles.extraText}>
                  Empresa: {item.productos?.empresa || 'No especificada'}
                </Text>
                {item.notas && (
                  <Text style={styles.extraText}>
                    Notas: {item.notas}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No se encontraron ventas para {selectedPeriod === 'hoy'
                ? `hoy (${formatCurrentDate()})`
                : periods.find(p => p.key === selectedPeriod)?.label.toLowerCase()}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Resumen */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>
          Resumen - {periods.find(p => p.key === selectedPeriod)?.label}
        </Text>
        <Text style={styles.summaryText}>
          📦 Recomendado pedir:{" "}
          <Text style={styles.bold}>
            {productosConDemandaAlta.length > 0
              ? productosConDemandaAlta.join(", ")
              : "Ninguno"}
          </Text>
        </Text>
        <Text style={styles.summaryText}>
          💰 Total ventas: Bs {filteredSales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#191a26" },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  search: {
    backgroundColor: "#262733",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    color: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
  },
  dateButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    minWidth: 70,
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "#1976D2",
    borderColor: "#1976D2",
  },
  buttonText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "500",
  },
  selectedButtonText: {
    color: "#fff",
  },
  clearButton: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  // Tarjeta estilo InventoryTable
  card: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // capa translúcida
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  row: { flexDirection: "row" },
  info: { marginLeft: 12, flex: 1, justifyContent: "center", color: "#fff" },
  name: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  detail: { fontSize: 14, color: "#fff", marginTop: 2 },
  verMas: {
    marginTop: 10,
    color: "#1976D2",
    fontWeight: "bold",
    textAlign: "right",
    fontSize: 15,
  },
  extra: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  extraText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: 'bold',
  },
  // Resumen
  summary: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },
  summaryTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 6, color: '#fff' },
  summaryText: { fontSize: 14, color: '#fff', marginTop: 4 },
  bold: { fontWeight: "bold", color: '#fff' },
});