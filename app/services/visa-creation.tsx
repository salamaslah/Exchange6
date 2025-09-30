import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { customerService } from '@/lib/supabase';

interface CustomerInfo {
  customer_name: string;
  national_id: string;
  phone_number: string;
  birth_date: string;
}

export default function VisaCreationScreen() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [visaData, setVisaData] = useState({
    visaType: 'debit', // debit or credit
    bankName: '',
    accountNumber: '',
    initialDeposit: '',
    monthlyLimit: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
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
      if (customerId) {
        console.log('🔍 جلب بيانات الزبون:', customerId);
        const customer = await customerService.getByNationalId(customerId);
        if (customer) {
          setCustomerInfo(customer);
          console.log('✅ تم تحميل بيانات الزبون:', customer.customer_name);
        }
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
    if (!customerInfo?.phone_number?.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال رقم الهاتف' : 
        language === 'he' ? 'אנא הכנס מספר טלפון' : 
        'Please enter phone number'
      );
      return;
    }

    if (!visaData.bankName.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال اسم البنك' : 
        language === 'he' ? 'אנא הכנס שם הבנק' : 
        'Please enter bank name'
      );
      return;
    }

    if (!visaData.accountNumber.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال رقم الحساب' : 
        language === 'he' ? 'אנא הכנס מספר חשבון' : 
        'Please enter account number'
      );
      return;
    }

    if (!visaData.initialDeposit.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال مبلغ الإيداع الأولي' : 
        language === 'he' ? 'אנא הכנס סכום הפקדה ראשונית' : 
        'Please enter initial deposit amount'
      );
      return;
    }

    if (!idImage) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى رفع صورة الهوية' : 
        language === 'he' ? 'אנא העלה תמונת תעודת זהות' : 
        'Please upload ID photo'
      );
      return;
    }

    if (!licenseImage) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى رفع صورة رخصة القيادة' : 
        language === 'he' ? 'אנא העלה תמונת רישיון נהיגה' : 
        'Please upload driver license photo'
      );
      return;
    }

    try {
      setLoading(true);
      
      // إنشاء طلب الفيزا
      const visaRequest = {
        id: Date.now().toString(),
        service: 'visa-creation',
        customerId: customerInfo?.national_id,
        customerName: customerInfo?.customer_name,
        visaType: visaData.visaType,
        bankName: visaData.bankName,
        accountNumber: visaData.accountNumber,
        initialDeposit: parseFloat(visaData.initialDeposit),
        monthlyLimit: visaData.monthlyLimit ? parseFloat(visaData.monthlyLimit) : null,
        notes: visaData.notes,
        phoneNumber: customerInfo?.phone_number,
        idImageUri: idImage,
        licenseImageUri: licenseImage,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // حفظ الطلب
      const savedRequests = await AsyncStorage.getItem('serviceRequests');
      const requests = savedRequests ? JSON.parse(savedRequests) : [];
      requests.push(visaRequest);
      await AsyncStorage.setItem('serviceRequests', JSON.stringify(requests));

      console.log('✅ تم حفظ طلب إنشاء الفيزا:', visaRequest);

      Alert.alert(
        language === 'ar' ? '✅ تم إرسال الطلب' : 
        language === 'he' ? '✅ הבקשה נשלחה' : 
        '✅ Request Submitted',
        
        language === 'ar' ? `تم إرسال طلب إنشاء فيزا ${visaData.visaType === 'debit' ? 'خصم' : 'ائتمان'} للمراجعة` :
        language === 'he' ? `בקשת יצירת כרטיס ${visaData.visaType === 'debit' ? 'חיוב' : 'אשראי'} נשלחה לבדיקה` :
        `${visaData.visaType === 'debit' ? 'Debit' : 'Credit'} card creation request submitted for review`,
        
        [
          {
            text: language === 'ar' ? 'العودة للأسعار' : 
                  language === 'he' ? 'חזרה למחירים' : 
                  'Back to Prices',
            onPress: () => router.replace('/(tabs)/prices')
          }
        ]
      );

    } catch (error) {
      console.error('خطأ في إرسال طلب الفيزا:', error);
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

  const pickImage = async (type: 'id' | 'license') => {
    try {
      // طلب الإذن للوصول للمعرض
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          language === 'ar' ? 'إذن مطلوب' : language === 'he' ? 'נדרש אישור' : 'Permission Required',
          language === 'ar' ? 'نحتاج إذن للوصول للصور' : language === 'he' ? 'אנחנו צריכים אישור לגישה לתמונות' : 'We need permission to access photos'
        );
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
          console.log('✅ تم اختيار صورة الهوية:', imageUri);
        } else {
          setLicenseImage(imageUri);
          console.log('✅ تم اختيار صورة الرخصة:', imageUri);
        }
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'حدث خطأ في اختيار الصورة' : language === 'he' ? 'אירעה שגיאה בבחירת התמונה' : 'Error occurred while selecting image'
      );
    }
  };

  const removeImage = (type: 'id' | 'license') => {
    if (type === 'id') {
      setIdImage(null);
      console.log('🗑️ تم حذف صورة الهوية');
    } else {
      setLicenseImage(null);
      console.log('🗑️ تم حذف صورة الرخصة');
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
            {language === 'ar' && '💳 إنشاء فيزا جديدة'}
            {language === 'he' && '💳 יצירת כרטיס חדש'}
            {language === 'en' && '💳 Create New Card'}
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
            <Text style={[styles.customerInfoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && `الهاتف: ${customerInfo.phone_number}`}
              {language === 'he' && `טלפון: ${customerInfo.phone_number}`}
              {language === 'en' && `Phone: ${customerInfo.phone_number}`}
            </Text>
            
            {/* إضافة حقل رقم الهاتف للتعديل */}
            <View style={styles.phoneInputContainer}>
              <Text style={[styles.phoneInputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'تحديث رقم الهاتف:'}
                {language === 'he' && 'עדכון מספר טלפון:'}
                {language === 'en' && 'Update Phone Number:'}
              </Text>
              <TextInput
                style={[styles.phoneInput, { textAlign: 'center' }]}
                value={customerInfo?.phone_number || ''}
                onChangeText={(text) => {
                  if (customerInfo) {
                    const updatedCustomer = { ...customerInfo, phone_number: text };
                    // هنا يمكن تحديث customerInfo إذا كان هناك setter
                  }
                }}
                placeholder="0501234567"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Visa Creation Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'تفاصيل الفيزا الجديدة:'}
              {language === 'he' && 'פרטי הכרטיס החדש:'}
              {language === 'en' && 'New Card Details:'}
            </Text>

            {/* Visa Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'نوع الفيزا:'}
                {language === 'he' && 'סוג הכרטיס:'}
                {language === 'en' && 'Card Type:'}
              </Text>
              <View style={styles.visaTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.visaTypeButton,
                    visaData.visaType === 'debit' && styles.selectedVisaType
                  ]}
                  onPress={() => setVisaData(prev => ({ ...prev, visaType: 'debit' }))}
                >
                  <Text style={[
                    styles.visaTypeText,
                    visaData.visaType === 'debit' && styles.selectedVisaTypeText
                  ]}>
                    {language === 'ar' && '💳 فيزا خصم'}
                    {language === 'he' && '💳 כרטיס חיוב'}
                    {language === 'en' && '💳 Debit Card'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.visaTypeButton,
                    visaData.visaType === 'credit' && styles.selectedVisaType
                  ]}
                  onPress={() => setVisaData(prev => ({ ...prev, visaType: 'credit' }))}
                >
                  <Text style={[
                    styles.visaTypeText,
                    visaData.visaType === 'credit' && styles.selectedVisaTypeText
                  ]}>
                    {language === 'ar' && '💎 فيزا ائتمان'}
                    {language === 'he' && '💎 כרטיס אשראי'}
                    {language === 'en' && '💎 Credit Card'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bank Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'اسم البنك:'}
                {language === 'he' && 'שם הבנק:'}
                {language === 'en' && 'Bank Name:'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: getTextAlign() }]}
                value={visaData.bankName}
                onChangeText={(text) => setVisaData(prev => ({ ...prev, bankName: text }))}
                placeholder={
                  language === 'ar' ? 'مثال: بنك هبوعليم' :
                  language === 'he' ? 'דוגמה: בנק הפועלים' :
                  'Example: Bank Hapoalim'
                }
              />
            </View>

            {/* Account Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'رقم الحساب:'}
                {language === 'he' && 'מספר חשבון:'}
                {language === 'en' && 'Account Number:'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                value={visaData.accountNumber}
                onChangeText={(text) => setVisaData(prev => ({ ...prev, accountNumber: text }))}
                placeholder="123456789"
                keyboardType="numeric"
              />
            </View>

            {/* Initial Deposit */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'مبلغ الإيداع الأولي (شيقل):'}
                {language === 'he' && 'סכום הפקדה ראשונית (שקל):'}
                {language === 'en' && 'Initial Deposit (Shekel):'}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                value={visaData.initialDeposit}
                onChangeText={(text) => setVisaData(prev => ({ ...prev, initialDeposit: text }))}
                placeholder="1000.00"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Monthly Limit (Optional for Credit Cards) */}
            {visaData.visaType === 'credit' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && 'الحد الشهري (شيقل) - اختياري:'}
                  {language === 'he' && 'מגבלה חודשית (שקל) - אופציונלי:'}
                  {language === 'en' && 'Monthly Limit (Shekel) - Optional:'}
                </Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center' }]}
                  value={visaData.monthlyLimit}
                  onChangeText={(text) => setVisaData(prev => ({ ...prev, monthlyLimit: text }))}
                  placeholder="5000.00"
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* رفع صورة الهوية */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'صورة الهوية (مطلوبة):'}
                {language === 'he' && 'תמונת תעודת זהות (נדרש):'}
                {language === 'en' && 'ID Photo (Required):'}
              </Text>
              
              {idImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: idImage }} style={styles.uploadedImage} />
                  <View style={styles.imageActions}>
                    <TouchableOpacity 
                      style={styles.changeImageButton}
                      onPress={() => pickImage('id')}
                    >
                      <Text style={styles.changeImageButtonText}>
                        {language === 'ar' && 'تغيير الصورة'}
                        {language === 'he' && 'שנה תמונה'}
                        {language === 'en' && 'Change Image'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage('id')}
                    >
                      <Text style={styles.removeImageButtonText}>
                        {language === 'ar' && 'حذف'}
                        {language === 'he' && 'מחק'}
                        {language === 'en' && 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => pickImage('id')}
                >
                  <Text style={styles.uploadButtonIcon}>📷</Text>
                  <Text style={[styles.uploadButtonText, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && 'اختيار صورة الهوية'}
                    {language === 'he' && 'בחר תמונת תעודת זהות'}
                    {language === 'en' && 'Select ID Photo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* رفع صورة رخصة القيادة */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'صورة رخصة القيادة (مطلوبة):'}
                {language === 'he' && 'תמונת רישיון נהיגה (נדרש):'}
                {language === 'en' && 'Driver License Photo (Required):'}
              </Text>
              
              {licenseImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: licenseImage }} style={styles.uploadedImage} />
                  <View style={styles.imageActions}>
                    <TouchableOpacity 
                      style={styles.changeImageButton}
                      onPress={() => pickImage('license')}
                    >
                      <Text style={styles.changeImageButtonText}>
                        {language === 'ar' && 'تغيير الصورة'}
                        {language === 'he' && 'שנה תמונה'}
                        {language === 'en' && 'Change Image'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage('license')}
                    >
                      <Text style={styles.removeImageButtonText}>
                        {language === 'ar' && 'حذف'}
                        {language === 'he' && 'מחק'}
                        {language === 'en' && 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => pickImage('license')}
                >
                  <Text style={styles.uploadButtonIcon}>📄</Text>
                  <Text style={[styles.uploadButtonText, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && 'اختيار صورة رخصة القيادة'}
                    {language === 'he' && 'בחר תמונת רישיון נהיגה'}
                    {language === 'en' && 'Select Driver License Photo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'ملاحظات إضافية (اختياري):'}
                {language === 'he' && 'הערות נוספות (אופציונלי):'}
                {language === 'en' && 'Additional Notes (Optional):'}
              </Text>
              <TextInput
                style={[styles.textArea, { textAlign: getTextAlign() }]}
                value={visaData.notes}
                onChangeText={(text) => setVisaData(prev => ({ ...prev, notes: text }))}
                placeholder={
                  language === 'ar' ? 'أي ملاحظات خاصة...' :
                  language === 'he' ? 'הערות מיוחדות...' :
                  'Any special notes...'
                }
                multiline={true}
                numberOfLines={3}
              />
            </View>

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
                  language === 'ar' ? '📤 إرسال طلب إنشاء الفيزا' :
                  language === 'he' ? '📤 שלח בקשת יצירת כרטיס' :
                  '📤 Submit Card Creation Request'
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
              {language === 'ar' && '• رقم الهاتف وصور الهوية والرخصة مطلوبة'}
              {language === 'he' && '• מספר טלפון ותמונות זהות ורישיון נדרשים'}
              {language === 'en' && '• Phone number and ID/license photos are required'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• سيتم مراجعة طلبك من قبل الموظفين'}
              {language === 'he' && '• הבקשה שלך תיבדק על ידי הצוות'}
              {language === 'en' && '• Your request will be reviewed by staff'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• قد تستغرق العملية 3-5 أيام عمل'}
              {language === 'he' && '• התהליך עשוי לקחת 3-5 ימי עבודה'}
              {language === 'en' && '• Process may take 3-5 business days'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• ستتلقى اتصالاً عند جاهزية الفيزا'}
              {language === 'he' && '• תקבל שיחה כשהכרטיס יהיה מוכן'}
              {language === 'en' && '• You will receive a call when card is ready'}
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
  textArea: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
    height: 80,
    textAlignVertical: 'top',
  },
  visaTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  visaTypeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedVisaType: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  visaTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  selectedVisaTypeText: {
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
  // Phone Input Styles
  phoneInputContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  phoneInputLabel: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
    fontWeight: '600',
  },
  phoneInput: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
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