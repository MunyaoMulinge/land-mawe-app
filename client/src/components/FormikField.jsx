import { useField } from 'formik';

export default function FormikField({ label, type = 'text', ...props }) {
  const [field, meta] = useField(props);
  const hasError = meta.touched && meta.error;

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '0.35rem', 
          fontWeight: 500,
          fontSize: '0.8rem',
          color: 'var(--text-primary)'
        }}>
          {label}
          {props.required && <span style={{ color: '#dc3545' }}> *</span>}
        </label>
      )}
      {type === 'select' ? (
        <select
          {...field}
          {...props}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: `1px solid ${hasError ? '#dc3545' : 'var(--border-color)'}`,
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease'
          }}
        />
      ) : type === 'textarea' ? (
        <textarea
          {...field}
          {...props}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: `1px solid ${hasError ? '#dc3545' : 'var(--border-color)'}`,
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            minHeight: '100px',
            resize: 'vertical',
            transition: 'all 0.3s ease'
          }}
        />
      ) : (
        <input
          type={type}
          {...field}
          {...props}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: `1px solid ${hasError ? '#dc3545' : 'var(--border-color)'}`,
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease'
          }}
        />
      )}
      {hasError && (
        <div style={{ 
          color: '#dc3545', 
          fontSize: '0.75rem', 
          marginTop: '0.25rem' 
        }}>
          {meta.error}
        </div>
      )}
    </div>
  );
}
