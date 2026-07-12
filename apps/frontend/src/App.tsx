import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import FarmerListings from './pages/farmer/Listings';
import FarmerOrders from './pages/farmer/Orders';
import FarmerForecast from './pages/farmer/Forecast';
import FarmerComplaints from './pages/farmer/Complaints';
import BuyerCatalogue from './pages/buyer/Catalogue';
import BuyerOrders from './pages/buyer/Orders';
import BuyerComplaints from './pages/buyer/Complaints';
import DriverDeliveries from './pages/driver/Deliveries';
import AdminAnalytics from './pages/admin/Analytics';
import AdminDeliveries from './pages/admin/Scheduling';
import AdminComplaints from './pages/admin/Complaints';
import AdminMembers from './pages/admin/Members';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />;
}

const wrap = (roles: any, el: JSX.Element) => (
  <ProtectedRoute roles={roles}>
    <Layout>{el}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/farmer" element={wrap(['farmer'], <FarmerListings />)} />
      <Route path="/farmer/orders" element={wrap(['farmer'], <FarmerOrders />)} />
      <Route path="/farmer/forecast" element={wrap(['farmer'], <FarmerForecast />)} />
      <Route path="/farmer/complaints" element={wrap(['farmer'], <FarmerComplaints />)} />

      <Route path="/buyer" element={wrap(['buyer'], <BuyerCatalogue />)} />
      <Route path="/buyer/orders" element={wrap(['buyer'], <BuyerOrders />)} />
      <Route path="/buyer/complaints" element={wrap(['buyer'], <BuyerComplaints />)} />

      <Route path="/driver" element={wrap(['driver'], <DriverDeliveries />)} />

      <Route path="/admin" element={wrap(['admin'], <AdminAnalytics />)} />
      <Route path="/admin/deliveries" element={wrap(['admin'], <AdminDeliveries />)} />
      <Route path="/admin/complaints" element={wrap(['admin'], <AdminComplaints />)} />
      <Route path="/admin/members" element={wrap(['admin'], <AdminMembers />)} />

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
