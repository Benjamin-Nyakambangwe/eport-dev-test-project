import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  white: '#ffffff',
  muted: '#6c757d',
  border: '#e1e4e8',
  background: '#f8f9fa',
};

export const FONTS = {
  regular: 'Inter-Regular',
  // Add other font weights if you have them
  // medium: 'Inter-Medium',
  // bold: 'Inter-Bold',
};

const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  text: {
    fontFamily: FONTS.regular,
    color: COLORS.dark,
  },
  heading: {
    fontFamily: FONTS.regular,
    fontWeight: 'bold',
    fontSize: 22,
    color: COLORS.dark,
  },
  subheading: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: COLORS.dark,
    marginBottom: 16,
  },
  paragraph: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.dark,
    lineHeight: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  input: {
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.dark,
  },
});

export default globalStyles; 