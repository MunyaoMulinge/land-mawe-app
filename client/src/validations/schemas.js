import * as Yup from 'yup';

// User validation schema
export const userSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  // Password is required - admin sets it directly
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .when('$isEditing', {
      is: false,
      then: (schema) => schema.required('Password is required'),
      otherwise: (schema) => schema.notRequired()
    }),
  phone: Yup.string()
    .matches(/^[0-9\-\+\s]+$/, 'Invalid phone number')
    .nullable(),
  role: Yup.string()
    .oneOf(['staff', 'admin', 'finance', 'driver', 'superadmin'], 'Invalid role')
    .required('Role is required')
});

// Driver validation schema
export const driverSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  phone: Yup.string()
    .matches(/^[0-9\-\+\s]+$/, 'Invalid phone number')
    .nullable(),
  license_number: Yup.string()
    .min(3, 'License number is too short')
    .required('License number is required')
});

// Driver account linking schema
export const driverAccountSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  phone: Yup.string()
    .matches(/^[0-9\-\+\s]+$/, 'Invalid phone number')
    .nullable()
});

// Fuel record schema
export const fuelSchema = Yup.object({
  truck_id: Yup.number()
    .required('Truck is required'),
  driver_id: Yup.number()
    .required('Driver is required'),
  fuel_date: Yup.date()
    .required('Date is required'),
  quantity_liters: Yup.number()
    .positive('Liters must be positive')
    .required('Liters is required'),
  cost_per_liter: Yup.number()
    .positive('Cost must be positive')
    .required('Cost is required'),
  fuel_station: Yup.string()
    .min(2, 'Station name is too short'),
  station_location: Yup.string()
    .min(2, 'Location is too short'),
  receipt_number: Yup.string()
    .nullable(),
  odometer_reading: Yup.number()
    .positive('Odometer must be positive')
    .nullable(),
  fuel_type: Yup.string()
    .oneOf(['diesel', 'petrol', 'gas'], 'Invalid fuel type'),
  payment_method: Yup.string()
    .oneOf(['cash', 'card', 'mpesa', 'corporate'], 'Invalid payment method'),
  notes: Yup.string()
    .nullable(),
  gps_coordinates: Yup.string()
    .nullable(),
  gps_accuracy: Yup.number()
    .nullable(),
  gps_timestamp: Yup.string()
    .nullable()
});

// Login schema
export const loginSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
});

// Registration schema
export const registerSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  phone: Yup.string()
    .matches(/^[0-9\-\+\s]+$/, 'Invalid phone number')
    .nullable()
});

// Invoice schema
export const invoiceSchema = Yup.object({
  client_id: Yup.number()
    .required('Client is required'),
  invoice_date: Yup.date()
    .required('Invoice date is required'),
  due_date: Yup.date()
    .required('Due date is required'),
  items: Yup.array().of(
    Yup.object({
      description: Yup.string().required('Description is required'),
      quantity: Yup.number().positive().required('Quantity is required'),
      unit_price: Yup.number().positive().required('Unit price is required')
    })
  ).min(1, 'At least one item is required')
});

// Payment schema
export const paymentSchema = Yup.object({
  amount: Yup.number()
    .positive('Amount must be positive')
    .required('Amount is required'),
  payment_date: Yup.date()
    .required('Payment date is required'),
  payment_method: Yup.string()
    .oneOf(['bank_transfer', 'mpesa', 'cash', 'cheque'], 'Invalid payment method')
    .required('Payment method is required'),
  reference_number: Yup.string()
    .nullable()
});

// Client schema
export const clientSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .nullable(),
  phone: Yup.string()
    .matches(/^[0-9\-\+\s]+$/, 'Invalid phone number')
    .required('Phone is required'),
  tax_pin: Yup.string()
    .matches(/^[AP]\d{9}[A-Z]$/, 'Invalid KRA PIN format (e.g. A123456789B)')
    .required('KRA PIN is required'),
  address: Yup.string()
    .nullable()
});

// Job card schema
export const jobCardSchema = Yup.object({
  truck_id: Yup.number()
    .required('Truck is required'),
  driver_id: Yup.number()
    .required('Driver is required'),
  client_name: Yup.string()
    .min(2, 'Client name is too short')
    .required('Client name is required'),
  event_start_date: Yup.date()
    .required('Start date is required'),
  event_finish_date: Yup.date()
    .required('Finish date is required'),
  purpose: Yup.string()
    .min(5, 'Purpose is too short')
    .required('Purpose is required')
});

// Equipment schema
export const equipmentSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  type: Yup.string()
    .oneOf(['audio', 'visual', 'lighting', 'other'], 'Invalid type'),
  quantity: Yup.number()
    .integer('Must be a whole number')
    .positive('Quantity must be positive')
    .required('Quantity is required')
});
