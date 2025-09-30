import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { customerService, transactionService } from '@/lib/supabase';

interface CustomerInfo {
  customer_name: string;
  national_id: string;
  phone_number: string;
  birth_date: string;
}

export default function CustomerInfoScreen() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    customer_name: '',
    national_id: '',
    phone_number: '',
    birth_date: ''
  });
  const [selectedService, setSelectedService] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSelectedService();
    loadLanguage();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSelectedService();
      loadLanguage();
    }, [])
  );

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

  const loadSelectedService = async () => {
    try {
      const serviceNumber = await AsyncStorage.getItem('selectedServiceNumber');
      const serviceName = await AsyncStorage.getItem('selectedServiceName');
      const serviceNameHe = await AsyncStorage.getItem('selectedServiceNameHe');
      const serviceNameEn = await AsyncStorage.getItem('selectedServiceNameEn');
      
      if (serviceNumber && serviceName) {
        const service = {
          service_number: parseInt(serviceNumber),
          service_name: serviceName,
          service_name_he: serviceNameHe || '',
          service_name_en: serviceNameEn || ''
        };
        
        setSelectedService(service);
        console.log('✅ تم تحميل الخدمة المختارة:', service);
      } else {
        console.log('❌ لم يتم العثور على خدمة مختارة');
        Alert.alert('خطأ', 'لم يتم اختيار خدمة');
        router.back();
      }
    } catch (error) {
      console.error('خطأ في تحميل الخدمة المختارة:', error);
    }
  };

  const getServiceName = () => {
    if (!selectedService) return '';
    
    switch (language) {
      case 'he':
        return selectedService.service_name_he || selectedService.service_name;
      case 'en':
        return selectedService.service_name_en || selectedService.service_name;
      default:
        return selectedService.service_name;
    }
  };

  const searchCustomer = async () => {
    if (!customerInfo.national_id.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهوية');
      return;
    }

    try {
      console.log(`🔍 البحث عن زبون برقم الهوية: ${customerInfo.national_id}`);
      
      const existingCustomer = await customerService.getByNationalId(customerInfo.national_id);
      
      if (existingCustomer) {
        console.log(`✅ تم العثور على الزبون: ${existingCustomer.customer_name}`);
        
        setCustomerInfo({
          customer_name: existingCustomer.customer_name,
          national_id: existingCustomer.national_id,
          phone_number: existingCustomer.phone_number || '',
          birth_date: existingCustomer.birth_date || ''
        });
        
        Alert.alert('تم العثور على الزبون', `الاسم: ${existingCustomer.customer_name}`);
      } else {
        console.log('📝 لم يتم العثور على الزبون - زبون جديد');
        Alert.alert('زبون جديد', 'لم يتم العثور على هذا الزبون، يرجى إدخال البيانات');
      }
    } catch (error) {
      console.error('خطأ في البحث عن الزبون:', error);
      Alert.alert('خطأ', 'حدث خطأ في البحث عن الزبون');
    }
  };

  const pickImage = async (type: 'id' | 'license') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول للصور');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (type === 'id') {
          setIdImage(imageUri);
          console.log('✅ تم اختيار صورة الهوية');
        } else {
          setLicenseImage(imageUri);
          console.log('✅ تم اختيار صورة الرخصة');
        }
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'حدث خطأ في اختيار الصورة');
    }
  };

  const handleContinue = async () => {
    // التحقق من البيانات المطلوبة
    if (!customerInfo.customer_name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الزبون');
      return;
    }

    if (!customerInfo.national_id.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهوية');
      return;
    }

    if (!customerInfo.birth_date.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال تاريخ الميلاد');
      return;
    }

    // التحقق من المتطلبات الخاصة لخدمة إنشاء الفيزا
    if (selectedService?.service_number === 1) {
      if (!customerInfo.phone_number.trim()) {
        Alert.alert('خطأ', 'رقم الهاتف مطلوب لخدمة إنشاء الفيزا');
        return;
      }

      if (!idImage) {
        Alert.alert('خطأ', 'صورة الهوية مطلوبة لخدمة إنشاء الفيزا');
        return;
      }

      if (!licenseImage) {
        Alert.alert('خطأ', 'صورة رخصة القيادة مطلوبة لخدمة إنشاء الفيزا');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('🔄 معالجة بيانات الزبون...');

      // حفظ أو تحديث بيانات الزبون
      try {
        const existingCustomer = await customerService.getByNationalId(customerInfo.national_id);
        
        const customerData = {
          customer_name: customerInfo.customer_name,
          national_id: customerInfo.national_id,
          phone_number: customerInfo.phone_number,
          birth_date: customerInfo.birth_date,
          image1_data: idImage ? await convertImageToBase64(idImage) : null,
          image1_type: idImage ? 'image/jpeg' : null,
          image2_data: licenseImage ? await convertImageToBase64(licenseImage) : null,
          image2_type: licenseImage ? 'image/jpeg' : null
        };
        
        if (existingCustomer) {
          await customerService.update(existingCustomer.id, customerData);
          console.log('✅ تم تحديث بيانات الزبون');
        } else {
          await customerService.create(customerData);
          console.log('✅ تم إنشاء زبون جديد');
        }
      } catch (customerError) {
        console.error('❌ خطأ في حفظ بيانات الزبون:', customerError);
        Alert.alert('تحذير', 'حدث خطأ في حفظ بيانات الزبون، لكن سيتم المتابعة');
      }

      // معالجة خاصة لخدمة إنشاء الفيزا
      if (selectedService?.service_number === 1) {
        try {
          const transactionData = {
            service_number: 1,
            amount_paid: 45,
            currency_paid: 'ILS',
            amount_received: 0,
            currency_received: 'ILS',
            customer_id: customerInfo.national_id,
            notes: `طلب إنشاء فيزا - الزبون: ${customerInfo.customer_name} - الهاتف: ${customerInfo.phone_number}`
          };
          
          await transactionService.create(transactionData);
          console.log('✅ تم حفظ معاملة إنشاء الفيزا');
          
          // تنظيف البيانات المؤقتة
          await clearTemporaryData();
          
          Alert.alert(
            '✅ تم تسجيل طلب إنشاء الفيزا',
            `🙏 شكراً لاختيارك محلنا\n\n` +
            `📋 يرجى التقدم إلى الشباك وانتظار دورك\n\n` +
            `تفاصيل الطلب:\n` +
            `الزبون: ${customerInfo.customer_name}\n` +
            `الخدمة: إنشاء فيزا\n` +
            `الرسوم: 45 شيقل\n\n` +
            `✅ تم تسجيل الطلب في النظام بنجاح`,
            [
              {
                text: '🏠 العودة للأسعار',
                onPress: () => router.replace('/(tabs)/prices')
              }
            ]
          );
          
        } catch (transactionError) {
          console.error('❌ خطأ في حفظ المعاملة:', transactionError);
          Alert.alert('خطأ', 'حدث خطأ في تسجيل المعاملة');
        }
      } else {
        // للخدمات الأخرى - حفظ البيانات والانتقال للخدمة
        await AsyncStorage.setItem('currentCustomerId', customerInfo.national_id);
        await AsyncStorage.setItem('currentCustomerName', customerInfo.customer_name);
        await AsyncStorage.setItem('currentCustomerPhone', customerInfo.phone_number);
        await AsyncStorage.setItem('currentCustomerBirthDate', customerInfo.birth_date);
        
        if (idImage) {
          await AsyncStorage.setItem('currentCustomerImage1', idImage);
        }
        if (licenseImage) {
          await AsyncStorage.setItem('currentCustomerImage2', licenseImage);
        }
        
        // الانتقال للخدمة المحددة
        const serviceRoutes: { [key: number]: string } = {
          2: '/services/transfer',
          3: '/services/remittance',
          4: '/services/check',
          5: '/services/bank',
          6: '/services/withdraw',
          7: '/services/deposit',
          8: '/services/exchange'
        };
        
        const route = serviceRoutes[selectedService?.service_number] || '/services/exchange';
        router.push(route);
      }

    } catch (error) {
      console.error('خطأ في معالجة البيانات:', error);
      Alert.alert('خطأ', 'حدث خطأ في معالجة البيانات');
    } finally {
      setLoading(false);
    }
  };

  const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
    try {
      // في بيئة الويب، نحتاج لتحويل الصورة إلى base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // إزالة البادئة data:image/...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('خطأ في تحويل الصورة:', error);
      return null;
    }
  };

  const clearTemporaryData = async () => {
    try {
      await AsyncStorage.removeItem('selectedServiceNumber');
      await AsyncStorage.removeItem('selectedServiceName');
      await AsyncStorage.removeItem('selectedServiceNameHe');
      await AsyncStorage.removeItem('selectedServiceNameEn');
      await AsyncStorage.removeItem('currentCustomerId');
      await AsyncStorage.removeItem('currentCustomerName');
      await AsyncStorage.removeItem('currentCustomerPhone');
      await AsyncStorage.removeItem('currentCustomerBirthDate');
      await AsyncStorage.removeItem('currentCustomerImage1');
      await AsyncStorage.removeItem('currentCustomerImage2');
      console.log('🧹 تم تنظيف البيانات المؤقتة');
    } catch (error) {
      console.error('خطأ في تنظيف البيانات:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getTextAlign = () => {
    return language === 'en' ? 'left' : 'right';
  };

  const removeImage = (type: 'id' | 'license') => {
    if (type === 'id') {
      setIdImage(null);
    } else {
      setLicenseImage(null);
    }
  };

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
            {language === 'ar' && 'معلومات الزبون'}
            {language === 'he' && 'פרטי הלקוח'}
            {language === 'en' && 'Customer Information'}
          </Text>
          
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.content}>
          {/* Selected Service Display */}
          {selectedService && (
            <View style={styles.serviceContainer}>
              <Text style={[styles.serviceTitle, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'الخدمة المختارة:'}
                {language === 'he' && 'השירות הנבחר:'}
                {language === 'en' && 'Selected Service:'}
              </Text>
              <Text style={[styles.serviceName, { textAlign: getTextAlign() }]}>
                {getServiceName()}
              </Text>
            </View>
          )}

          {/* Customer Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'بيانات الزبون:'}
              {language === 'he' && 'פרטי הלקוח:'}
              {language === 'en' && 'Customer Details:'}
            </Text>

            {/* National ID with Search */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'رقم الهوية:'}
                {language === 'he' && 'מספר זהות:'}
                {language === 'en' && 'National ID:'}
              </Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, { textAlign: 'center' }]}
                  value={customerInfo.national_id}
                  onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, national_id: text }))}
                  placeholder="123456789"
                  keyboardType="numeric"
                  maxLength={9}
                />
                <TouchableOpacity style={styles.searchButton} onPress={searchCustomer}>
                  <Text style={styles.searchButtonText}>
                    {language === 'ar' && '🔍 بحث'}
                    {language === 'he' && '🔍 חיפוש'}
                    {language === 'en' && '🔍 Search'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'اسم الزبون:'}
                {language === 'he' && 'שם הלקוח:'}
                {language === 'en' && 'Customer Name:'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: getTextAlign() }]}
                value={customerInfo.customer_name}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, customer_name: text }))}
                placeholder={
                  language === 'ar' ? 'أحمد محمد' :
                  language === 'he' ? 'אחמד מוחמד' :
                  'Ahmed Mohammed'
                }
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'رقم الهاتف:'}
                {language === 'he' && 'מספר טלפון:'}
                {language === 'en' && 'Phone Number:'}
                {selectedService?.service_number === 1 && (
                  <Text style={styles.requiredText}> *</Text>
                )}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                value={customerInfo.phone_number}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone_number: text }))}
                placeholder="0501234567"
                keyboardType="phone-pad"
              />
            </View>

            {/* Birth Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'تاريخ الميلاد:'}
                {language === 'he' && 'תאריך לידה:'}
                {language === 'en' && 'Birth Date:'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                value={customerInfo.birth_date}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, birth_date: text }))}
                placeholder="1990-01-01"
              />
            </View>

            {/* Images for Visa Creation Service */}
            {selectedService?.service_number === 1 && (
              <>
                {/* ID Image */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && 'صورة الهوية:'}
                    {language === 'he' && 'תמונת תעודת זהות:'}
                    {language === 'en' && 'ID Photo:'}
                    <Text style={styles.requiredText}> *</Text>
                  </Text>
                  
                  {idImage ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: idImage }} style={styles.uploadedImage} />
                      <View style={styles.imageActions}>
                        <TouchableOpacity 
                          style={styles.changeImageButton}
                          onPress={() => pickImage('id')}
                        >
                          <Text style={styles.changeImageButtonText}>تغيير</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImage('id')}
                        >
                          <Text style={styles.removeImageButtonText}>حذف</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={() => pickImage('id')}
                    >
                      <Text style={styles.uploadButtonIcon}>📷</Text>
                      <Text style={styles.uploadButtonText}>اختيار صورة الهوية</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* License Image */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && 'صورة رخصة القيادة:'}
                    {language === 'he' && 'תמונת רישיון נהיגה:'}
                    {language === 'en' && 'Driver License Photo:'}
                    <Text style={styles.requiredText}> *</Text>
                  </Text>
                  
                  {licenseImage ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: licenseImage }} style={styles.uploadedImage} />
                      <View style={styles.imageActions}>
                        <TouchableOpacity 
                          style={styles.changeImageButton}
                          onPress={() => pickImage('license')}
                        >
                          <Text style={styles.changeImageButtonText}>تغيير</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImage('license')}
                        >
                          <Text style={styles.removeImageButtonText}>حذف</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={() => pickImage('license')}
                    >
                      <Text style={styles.uploadButtonIcon}>📄</Text>
                      <Text style={styles.uploadButtonText}>اختيار صورة الرخصة</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* Continue Button */}
            <TouchableOpacity 
              style={[styles.continueButton, loading && styles.disabledButton]} 
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={styles.continueButtonText}>
                {loading ? (
                  language === 'ar' ? 'جاري المعالجة...' :
                  language === 'he' ? 'מעבד...' :
                  'Processing...'
                ) : (
                  language === 'ar' ? '➡️ متابعة' :
                  language === 'he' ? '➡️ המשך' :
                  '➡️ Continue'
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Information Section */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'ℹ️ معلومات:'}
              {language === 'he' && 'ℹ️ מידע:'}
              {language === 'en' && 'ℹ️ Information:'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• يمكنك البحث عن زبون موجود بإدخال رقم الهوية والضغط على بحث'}
              {language === 'he' && '• ניתן לחפש לקוח קיים על ידי הכנסת מספר זהות ולחיצה על חיפוש'}
              {language === 'en' && '• You can search for existing customer by entering ID and clicking search'}
            </Text>
            {selectedService?.service_number === 1 && (
              <>
                <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && '• رقم الهاتف وصور الهوية والرخصة مطلوبة لخدمة إنشاء الفيزا'}
                  {language === 'he' && '• מספר טלפון ותמונות זהות ורישיון נדרשים ליצירת כרטיס'}
                  {language === 'en' && '• Phone number and ID/license photos required for card creation'}
                </Text>
                <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && '• رسوم إنشاء الفيزا: 45 شيقل'}
                  {language === 'he' && '• עמלת יצירת כרטיס: 45 שקל'}
                  {language === 'en' && '• Card creation fee: 45 Shekel'}
                </Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF7FF',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
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
    color: '#7C3AED',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  serviceContainer: {
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    color: '#1E40AF',
    fontWeight: '600',
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
  requiredText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: 'bold',
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
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#7C3AED',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7C3AED',
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
  continueButtonText: {
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
  // Image Upload Styles
  uploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  uploadButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
  },
  uploadedImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  changeImageButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeImageButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});