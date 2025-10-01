import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transactionService } from '@/lib/supabase';

interface CustomerInfo {
  customer_name: string;
  national_id: string;
  phone_number: string;
  birth_date: string;
}

export default function TransferScreen() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [transferData, setTransferData] = useState({
    country: '',
    amount: '',
    isBankTransfer: false,
    accountNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const router = useRouter();

  useEffect(() => {
    loadCustomerInfo();
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
      }
    } catch (error) {
      console.log('خطأ في تحميل اللغة:', error);
    }
  };

  const loadCustomerInfo = async () => {
    try {
      const customerId = await AsyncStorage.getItem('currentCustomerId');
      const customerName = await AsyncStorage.getItem('currentCustomerName');
      const customerPhone = await AsyncStorage.getItem('currentCustomerPhone');
      const customerBirthDate = await AsyncStorage.getItem('currentCustomerBirthDate');
      
      if (customerId && customerName) {
        console.log('🔍 تحميل بيانات الزبون من التخزين المحلي:', customerId);
        
        const customer = {
          customer_name: customerName,
          national_id: customerId,
          phone_number: customerPhone || '',
          birth_date: customerBirthDate || ''
        };
        
        setCustomerInfo(customer);
        console.log('✅ تم تحميل بيانات الزبون:', customer.customer_name);
      } else {
        Alert.alert('خطأ', 'لم يتم العثور على بيانات الزبون');
        router.back();
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات الزبون:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل بيانات الزبون');
      router.back();
    }
  };

  const handleSubmit = async () => {
    // التحقق من البيانات المطلوبة
    if (!transferData.country.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال اسم الدولة' : 
        language === 'he' ? 'אנא הכנס שם המדינה' : 
        'Please enter country name'
      );
      return;
    }

    if (!transferData.amount.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال المبلغ' : 
        language === 'he' ? 'אנא הכנס סכום' : 
        'Please enter amount'
      );
      return;
    }

    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 
        language === 'he' ? 'אנא הכנס סכום תקין' : 
        'Please enter valid amount'
      );
      return;
    }

    if (transferData.isBankTransfer && !transferData.accountNumber.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال رقم الحساب' : 
        language === 'he' ? 'אנא הכנס מספר חשבון' : 
        'Please enter account number'
      );
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 معالجة طلب التحويل للخارج...');

      // إنشاء معاملة التحويل للخارج في جدول transactions
      try {
        const transactionData = {
          service_number: 2, // تحويل للخارج
          amount_paid: amount,
          currency_paid: 'ILS',
          amount_received: 0,
          currency_received: 'USD', // افتراضي
          customer_id: customerInfo?.national_id,
          notes: `تحويل للخارج - الدولة: ${transferData.country} - المبلغ: ${transferData.amount} شيقل - ${transferData.isBankTransfer ? `تحويل لحساب بنك - رقم الحساب: ${transferData.accountNumber}` : 'تحويل نقدي'} - الزبون: ${customerInfo?.customer_name}`
        };
        
        console.log('🔄 إنشاء معاملة التحويل للخارج في جدول transactions:', transactionData);
        
        // إضافة المعاملة إلى قاعدة البيانات
        await transactionService.create(transactionData);
        
        console.log('✅ تم حفظ معاملة التحويل للخارج في جدول transactions بنجاح');
      } catch (transactionError) {
        console.error('❌ خطأ في حفظ المعاملة في قاعدة البيانات:', transactionError);
        Alert.alert(
          language === 'ar' ? 'تحذير' : language === 'he' ? 'אזהרה' : 'Warning',
          language === 'ar' ? 'حدث خطأ في تسجيل المعاملة' : 
          language === 'he' ? 'אירעה שגיאה ברישום העסקה' : 
          'Error occurred recording transaction'
        );
        return;
      }

      // تنظيف البيانات المؤقتة
      await AsyncStorage.removeItem('currentCustomerId');
      await AsyncStorage.removeItem('currentCustomerName');
      await AsyncStorage.removeItem('currentCustomerPhone');
      await AsyncStorage.removeItem('currentCustomerBirthDate');
      await AsyncStorage.removeItem('selectedServiceNumber');
      await AsyncStorage.removeItem('selectedServiceName');
      await AsyncStorage.removeItem('selectedServiceNameHe');
      await AsyncStorage.removeItem('selectedServiceNameEn');

      // عرض رسالة النجاح
      Alert.alert(
        language === 'ar' ? '✅ تم تسجيل طلب التحويل بنجاح' : 
        language === 'he' ? '✅ בקשת ההעברה נרשמה בהצלחה' : 
        '✅ Transfer Request Recorded Successfully',
        
        language === 'ar' ? 
          `🙏 شكراً لاختيارك محلنا\n\n` +
          `📋 يرجى التقدم إلى الشباك وانتظار دورك\n\n` +
          `تفاصيل التحويل:\n` +
          `الزبون: ${customerInfo?.customer_name}\n` +
          `الخدمة: تحويل للخارج\n` +
          `الدولة: ${transferData.country}\n` +
          `المبلغ: ${transferData.amount} شيقل\n` +
          `نوع التحويل: ${transferData.isBankTransfer ? 'تحويل لحساب بنك' : 'تحويل نقدي'}\n` +
          `${transferData.isBankTransfer ? `رقم الحساب: ${transferData.accountNumber}\n` : ''}` +
          `✅ تم تسجيل الطلب في النظام بنجاح` :
        
        language === 'he' ? 
          `🙏 תודה שבחרת בחנות שלנו\n\n` +
          `📋 אנא פנה לדלפק והמתן לתורך\n\n` +
          `פרטי ההעברה:\n` +
          `לקוח: ${customerInfo?.customer_name}\n` +
          `שירות: העברה לחו"ל\n` +
          `מדינה: ${transferData.country}\n` +
          `סכום: ${transferData.amount} שקל\n` +
          `סוג העברה: ${transferData.isBankTransfer ? 'העברה לחשבון בנק' : 'העברה במזומן'}\n` +
          `${transferData.isBankTransfer ? `מספר חשבון: ${transferData.accountNumber}\n` : ''}` +
          `✅ הבקשה נרשמה במערכת בהצלחה` :
        
          `🙏 Thank you for choosing our store\n\n` +
          `📋 Please proceed to the counter and wait for your turn\n\n` +
          `Transfer Details:\n` +
          `Customer: ${customerInfo?.customer_name}\n` +
          `Service: International Transfer\n` +
          `Country: ${transferData.country}\n` +
          `Amount: ${transferData.amount} Shekel\n` +
          `Transfer Type: ${transferData.isBankTransfer ? 'Bank Account Transfer' : 'Cash Transfer'}\n` +
          `${transferData.isBankTransfer ? `Account Number: ${transferData.accountNumber}\n` : ''}` +
          `✅ Request recorded in system successfully`,
        
        [
          {
            text: language === 'ar' ? '🏠 العودة لأسعار اليوم' : 
                  language === 'he' ? '🏠 חזרה למחירי היום' : 
                  '🏠 Back to Today\'s Prices',
            onPress: () => router.replace('/(tabs)/prices')
          }
        ]
      );

    } catch (error) {
      console.error('خطأ في إرسال طلب التحويل:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'حدث خطأ في إرسال الطلب' : 
        language === 'he' ? 'אירעה שגיאה בשליחת הבקשה' : 
        'Error occurred while submitting request'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getTextAlign = () => {
    return language === 'en' ? 'left' : 'right';
  };

  if (!customerInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>
            {language === 'ar' && 'جاري تحميل بيانات الزبون...'}
            {language === 'he' && 'טוען נתוני לקוח...'}
            {language === 'en' && 'Loading customer data...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>
              {language === 'ar' && '← العودة'}
              {language === 'he' && '← חזרה'}
              {language === 'en' && '← Back'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {language === 'ar' && '🌍 تحويل للخارج'}
            {language === 'he' && '🌍 העברה לחו"ל'}
            {language === 'en' && '🌍 International Transfer'}
          </Text>
          
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.content}>
          {/* Customer Info Display */}
          <View style={styles.customerInfoContainer}>
            <Text style={[styles.customerInfoTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'بيانات الزبون:'}
              {language === 'he' && 'פרטי הלקוח:'}
              {language === 'en' && 'Customer Information:'}
            </Text>
            <Text style={[styles.customerInfoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && `الاسم: ${customerInfo.customer_name}`}
              {language === 'he' && `שם: ${customerInfo.customer_name}`}
              {language === 'en' && `Name: ${customerInfo.customer_name}`}
            </Text>
            <Text style={[styles.customerInfoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && `رقم الهوية: ${customerInfo.national_id}`}
              {language === 'he' && `מספר זהות: ${customerInfo.national_id}`}
              {language === 'en' && `National ID: ${customerInfo.national_id}`}
            </Text>
          </View>

          {/* Transfer Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'تفاصيل التحويل:'}
              {language === 'he' && 'פרטי ההעברה:'}
              {language === 'en' && 'Transfer Details:'}
            </Text>

            {/* Country */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'اسم الدولة:'}
                {language === 'he' && 'שם המדינה:'}
                {language === 'en' && 'Country Name:'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: getTextAlign() }]}
                value={transferData.country}
                onChangeText={(text) => setTransferData(prev => ({ ...prev, country: text }))}
                placeholder={
                  language === 'ar' ? 'مثال: الأردن' :
                  language === 'he' ? 'דוגמה: ירדן' :
                  'Example: Jordan'
                }
              />
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'المبلغ (بالشيقل):'}
                {language === 'he' && 'סכום (בשקל):'}
                {language === 'en' && 'Amount (in Shekel):'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                value={transferData.amount}
                onChangeText={(text) => setTransferData(prev => ({ ...prev, amount: text }))}
                placeholder="1000.00"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Bank Transfer Question */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'هل التحويل لحساب بنك؟'}
                {language === 'he' && 'האם ההעברה לחשבון בנק?'}
                {language === 'en' && 'Is this a bank account transfer?'}
              </Text>
              <View style={styles.bankTransferContainer}>
                <TouchableOpacity
                  style={[
                    styles.bankTransferButton,
                    transferData.isBankTransfer && styles.selectedBankTransfer
                  ]}
                  onPress={() => setTransferData(prev => ({ ...prev, isBankTransfer: true, accountNumber: prev.accountNumber }))}
                >
                  <Text style={[
                    styles.bankTransferText,
                    transferData.isBankTransfer && styles.selectedBankTransferText
                  ]}>
                    {language === 'ar' && '✅ نعم - لحساب بنك'}
                    {language === 'he' && '✅ כן - לחשבון בנק'}
                    {language === 'en' && '✅ Yes - Bank Account'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.bankTransferButton,
                    !transferData.isBankTransfer && styles.selectedBankTransfer
                  ]}
                  onPress={() => setTransferData(prev => ({ ...prev, isBankTransfer: false, accountNumber: '' }))}
                >
                  <Text style={[
                    styles.bankTransferText,
                    !transferData.isBankTransfer && styles.selectedBankTransferText
                  ]}>
                    {language === 'ar' && '💰 لا - تحويل نقدي'}
                    {language === 'he' && '💰 לא - העברה במזומן'}
                    {language === 'en' && '💰 No - Cash Transfer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Number (if bank transfer) */}
            {transferData.isBankTransfer && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && 'رقم الحساب:'}
                  {language === 'he' && 'מספר חשבון:'}
                  {language === 'en' && 'Account Number:'}
                </Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center' }]}
                  value={transferData.accountNumber}
                  onChangeText={(text) => setTransferData(prev => ({ ...prev, accountNumber: text }))}
                  placeholder="123456789"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? (
                  language === 'ar' ? 'جاري إرسال الطلب...' :
                  language === 'he' ? 'שולח בקשה...' :
                  'Submitting Request...'
                ) : (
                  language === 'ar' ? '📤 إرسال طلب التحويل' :
                  language === 'he' ? '📤 שלח בקשת העברה' :
                  '📤 Submit Transfer Request'
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Information Section */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'ℹ️ معلومات مهمة:'}
              {language === 'he' && 'ℹ️ מידע חשוב:'}
              {language === 'en' && 'ℹ️ Important Information:'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• التحويل متاح لجميع دول العالم'}
              {language === 'he' && '• ההעברה זמינה לכל מדינות העולם'}
              {language === 'en' && '• Transfer available to all countries worldwide'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• يمكن التحويل نقدياً أو لحساب بنك'}
              {language === 'he' && '• ניתן להעביר במזומן או לחשבון בנק'}
              {language === 'en' && '• Transfer can be cash pickup or bank account'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• سيتم مراجعة طلبك من قبل الموظفين'}
              {language === 'he' && '• הבקשה שלך תיבדק על ידי הצוות'}
              {language === 'en' && '• Your request will be reviewed by staff'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• قد تستغرق العملية 15-30 دقيقة'}
              {language === 'he' && '• התהליך עשוי לקחת 15-30 דקות'}
              {language === 'en' && '• Process may take 15-30 minutes'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    width: 80,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0369A1',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  customerInfoContainer: {
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  customerInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  customerInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  bankTransferContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  bankTransferButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedBankTransfer: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  bankTransferText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedBankTransferText: {
    color: '#1E40AF',
  },
  submitButton: {
    backgroundColor: '#0369A1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0369A1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 20,
  },
});