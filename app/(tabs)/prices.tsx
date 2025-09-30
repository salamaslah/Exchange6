import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, SafeAreaView, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService, companySettingsService, workingHoursService } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface Currency {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  name_he?: string;
  current_rate: number;
  buy_rate: number;
  sell_rate: number;
  is_active: boolean;
}

interface CompanyInfo {
  name_ar: string;
  name_he: string;
  name_en: string;
  address_ar: string;
  address_he: string;
  address_en: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
}

interface WorkingHours {
  day_of_week: string;
  is_working_day: boolean;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
}

interface Advertisement {
  id: string;
  position: string;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'sunday', ar: 'الأحد', he: 'ראשון', en: 'Sunday' },
  { key: 'monday', ar: 'الإثنين', he: 'שני', en: 'Monday' },
  { key: 'tuesday', ar: 'الثلاثاء', he: 'שלישי', en: 'Tuesday' },
  { key: 'wednesday', ar: 'الأربعاء', he: 'רביעי', en: 'Wednesday' },
  { key: 'thursday', ar: 'الخميس', he: 'חמישי', en: 'Thursday' },
  { key: 'friday', ar: 'الجمعة', he: 'שישי', en: 'Friday' },
  { key: 'saturday', ar: 'السبت', he: 'שבת', en: 'Saturday' }
];

export default function PricesScreen() {
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('ILS');
  const [toCurrency, setToCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [calculationDetails, setCalculationDetails] = useState('');
  const [inputSide, setInputSide] = useState<'left' | 'right'>('left');
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const router = useRouter();

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    loadData();
    loadLanguage();

    return () => subscription?.remove();
  }, []);

  // تبديل الإعلانات تلقائياً كل 5 ثوانٍ
  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % advertisements.length);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  useEffect(() => {
    saveLanguage();
    // إشعار صفحات أخرى بتغيير اللغة
    notifyLanguageChange();
  }, [language]);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  const saveLanguage = async () => {
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
      await AsyncStorage.setItem('languageChangeTimestamp', Date.now().toString());
      console.log('✅ تم حفظ اللغة مع timestamp:', language);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const notifyLanguageChange = async () => {
    try {
      await AsyncStorage.setItem('languageChanged', 'true');
      console.log('🔔 تم إشعار الصفحات الأخرى بتغيير اللغة');
    } catch (error) {
      console.log('خطأ في إشعار تغيير اللغة:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 بدء تحميل البيانات...');
      
      // تحميل جميع العملات من قاعدة البيانات (المتوفرة وغير المتوفرة)
      const currenciesData = await currencyService.getAll();
      
      // ترتيب العملات: المتوفرة أولاً ثم غير المتوفرة
      const sortedCurrencies = currenciesData.sort((a, b) => {
        // المتوفرة (is_active = true) أولاً
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        // ثم ترتيب أبجدي حسب الكود
        return a.code.localeCompare(b.code);
      });
      
      setAllCurrencies(sortedCurrencies);
      console.log(`✅ تم تحميل ${sortedCurrencies.length} عملة (متوفرة وغير متوفرة)`);
      console.log(`📊 العملات المتوفرة: ${sortedCurrencies.filter(c => c.is_active).length}`);
      console.log(`📊 العملات غير المتوفرة: ${sortedCurrencies.filter(c => !c.is_active).length}`);
      
      // تحميل معلومات الشركة
      const companyData = await companySettingsService.get();
      if (companyData) {
        setCompanyInfo(companyData);
        console.log('✅ تم تحميل معلومات الشركة');
        
        // تحميل أوقات العمل
        const workingHoursData = await workingHoursService.getByCompanyId(companyData.id);
        setWorkingHours(workingHoursData);
        console.log(`✅ تم تحميل ${workingHoursData.length} يوم من أوقات العمل`);
      }

      // تحميل الإعلانات من قاعدة البيانات
      await loadAdvertisements();
      
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdvertisements = async () => {
    try {
      console.log('🔄 جلب الإعلانات من جدول advertisements في قاعدة البيانات...');
      
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('created_at');
      
      if (error) {
        console.error('❌ خطأ في جلب الإعلانات من قاعدة البيانات:', error);
        throw error;
      }
      
      console.log(`✅ تم جلب ${data?.length || 0} إعلان من جدول advertisements`);
      setAdvertisements(data || []);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الإعلانات:', error);
      
      // في حالة الخطأ، استخدم إعلانات افتراضية
      const defaultAds: Advertisement[] = [
        {
          id: '1',
          position: 'header',
          title: 'Western Union - تحويل للخارج',
          description: 'خدمات تحويل الأموال السريعة والآمنة لجميع أنحاء العالم',
          image_url: 'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true
        },
        {
          id: '2',
          position: 'header',
          title: 'صرافة العملات المتميزة',
          description: 'أفضل أسعار الصرف في المدينة مع خدمة عملاء ممتازة',
          image_url: 'https://images.pexels.com/photos/259132/pexels-photo-259132.jpeg?auto=compress&cs=tinysrgb&w=300',
          is_active: true
        },
        {
          id: '3',
          position: 'header',
          title: 'MoneyGram - حوالات سريعة',
          description: 'استلام وإرسال الحوالات بأسرع وقت وأفضل الأسعار',
          image_url: 'https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg?auto=compress&cs=tinysrgb&w=300',
          is_active: true
        },
        {
          id: '4',
          position: 'header',
          title: 'WorldCom - خدمات الفيزا',
          description: 'سحب وإيداع من جميع أنواع بطاقات الفيزا والماستركارد',
          image_url: 'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true
        }
      ];
      
      console.log('📱 استخدام الإعلانات الافتراضية كبديل');
      setAdvertisements(defaultAds);
    }
  };

  const getWorkingDaysText = () => {
    if (!workingHours || workingHours.length === 0) {
      switch (language) {
        case 'he': return 'ראשון - חמישי, שבת';
        case 'en': return 'Sunday - Thursday, Saturday';
        default: return 'الأحد - الخميس، السبت';
      }
    }

    const workingDays = workingHours
      .filter(wh => wh.is_working_day === true || wh.is_working_day === 'true' as any)
      .map(wh => wh.day_of_week);

    if (workingDays.length === 0) {
      switch (language) {
        case 'he': return 'ראשון - חמישי, שבת';
        case 'en': return 'Sunday - Thursday, Saturday';
        default: return 'الأحد - الخميس، السبت';
      }
    }

    const orderedWorkingDays = DAYS_OF_WEEK
      .filter(day => workingDays.includes(day.key))
      .map(day => {
        switch (language) {
          case 'he': return day.he;
          case 'en': return day.en;
          default: return day.ar;
        }
      });

    if (language === 'ar') {
      return orderedWorkingDays.join(' - ');
    } else if (language === 'he') {
      return orderedWorkingDays.join(' - ');
    } else {
      return orderedWorkingDays.join(' - ');
    }
  };

  const getWorkingHoursText = () => {
    if (!workingHours || workingHours.length === 0) {
      return { morning: '09:00 - 14:00', evening: '16:00 - 18:00' };
    }

    const firstWorkingDay = workingHours.find(wh => wh.is_working_day === true || wh.is_working_day === 'true' as any);
    
    if (firstWorkingDay) {
      return {
        morning: `${firstWorkingDay.morning_start} - ${firstWorkingDay.morning_end}`,
        evening: `${firstWorkingDay.evening_start} - ${firstWorkingDay.evening_end}`
      };
    }

    return { morning: '09:00 - 14:00', evening: '16:00 - 18:00' };
  };

  const calculateConversion = (amount: string, side: 'left' | 'right') => {
    if (!amount || isNaN(parseFloat(amount))) {
      setFromAmount('');
      setToAmount('');
      setCalculationDetails('');
      return;
    }

    const inputAmount = parseFloat(amount);
    let result = 0;
    let details = '';

    const fromCurrencyData = allCurrencies.find(c => c.code === fromCurrency);
    const toCurrencyData = allCurrencies.find(c => c.code === toCurrency);

    if ((fromCurrency !== 'ILS' && !fromCurrencyData) || (toCurrency !== 'ILS' && !toCurrencyData)) {
      setCalculationDetails('عملة غير موجودة');
      return;
    }

    if (fromCurrency === toCurrency) {
      result = inputAmount;
      details = 'نفس العملة';
    } else {
      let targetCurrency, sourceCurrency, targetCurrencyData, sourceCurrencyData;
      
      if (side === 'right') {
        targetCurrency = toCurrency;
        sourceCurrency = fromCurrency;
        targetCurrencyData = toCurrencyData;
        sourceCurrencyData = fromCurrencyData;
      } else {
        targetCurrency = toCurrency;
        sourceCurrency = fromCurrency;
        targetCurrencyData = toCurrencyData;
        sourceCurrencyData = fromCurrencyData;
      }
      
      if (side === 'right') {
        if (targetCurrency === 'ILS') {
          result = inputAmount / sourceCurrencyData!.buy_rate;
          details = `${inputAmount.toFixed(2)} شيقل ÷ ${sourceCurrencyData!.buy_rate.toFixed(2)} (سعر الشراء) = ${result.toFixed(2)} ${sourceCurrency}`;
        } else if (sourceCurrency === 'ILS') {
          result = inputAmount * targetCurrencyData!.sell_rate;
          details = `${inputAmount.toFixed(2)} ${targetCurrency} × ${targetCurrencyData!.sell_rate.toFixed(2)} (سعر البيع) = ${result.toFixed(2)} شيقل`;
        } else {
          const shekelAmount = inputAmount * targetCurrencyData!.sell_rate;
          result = shekelAmount / sourceCurrencyData!.buy_rate;
          details = `${inputAmount.toFixed(2)} ${targetCurrency} × ${targetCurrencyData!.sell_rate.toFixed(2)} = ${shekelAmount.toFixed(2)} شيقل ÷ ${sourceCurrencyData!.buy_rate.toFixed(2)} = ${result.toFixed(2)} ${sourceCurrency}`;
        }
      } else {
        if (targetCurrency === 'ILS') {
          result = inputAmount * sourceCurrencyData!.buy_rate;
          details = `${inputAmount.toFixed(2)} ${sourceCurrency} × ${sourceCurrencyData!.buy_rate.toFixed(2)} (سعر الشراء) = ${result.toFixed(2)} شيقل`;
        } else if (sourceCurrency === 'ILS') {
          result = inputAmount / targetCurrencyData!.sell_rate;
          details = `${inputAmount.toFixed(2)} شيقل ÷ ${targetCurrencyData!.sell_rate.toFixed(2)} (سعر البيع) = ${result.toFixed(2)} ${targetCurrency}`;
        } else {
          const shekelAmount = inputAmount * sourceCurrencyData!.buy_rate;
          result = shekelAmount / targetCurrencyData!.sell_rate;
          details = `${inputAmount.toFixed(2)} ${sourceCurrency} × ${sourceCurrencyData!.buy_rate.toFixed(2)} = ${shekelAmount.toFixed(2)} شيقل ÷ ${targetCurrencyData!.sell_rate.toFixed(2)} = ${result.toFixed(2)} ${targetCurrency}`;
        }
      }
    }

    if (side === 'left') {
      setToAmount(result.toFixed(2));
    } else {
      setFromAmount(result.toFixed(2));
    }

    setCalculationDetails(details);
  };

  const handleFromAmountChange = (text: string) => {
    setFromAmount(text);
    setInputSide('left');
    calculateConversion(text, 'left');
    resetInactivityTimer();
  };

  const handleToAmountChange = (text: string) => {
    setToAmount(text);
    setInputSide('right');
    calculateConversion(text, 'right');
    resetInactivityTimer();
  };

  const swapCurrencies = () => {
    const tempCurrency = fromCurrency;
    const tempAmount = fromAmount;
    
    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
    
    if (toAmount) {
      calculateConversion(toAmount, 'left');
    }
    resetInactivityTimer();
  };

  const cycleCurrency = (currentCurrency: string, isFromCurrency: boolean) => {
    const allCurrenciesWithILS = [
      { code: 'ILS', name_ar: 'شيقل إسرائيلي' },
      ...allCurrencies.filter(c => c.is_active) // فقط العملات المتوفرة في الحاسبة
    ];
    
    const currentIndex = allCurrenciesWithILS.findIndex(c => c.code === currentCurrency);
    const nextIndex = (currentIndex + 1) % allCurrenciesWithILS.length;
    const nextCurrency = allCurrenciesWithILS[nextIndex].code;
    
    if (isFromCurrency) {
      setFromCurrency(nextCurrency);
      if (fromAmount) {
        calculateConversion(fromAmount, 'left');
      }
    } else {
      setToCurrency(nextCurrency);
      if (fromAmount) {
        calculateConversion(fromAmount, 'left');
      }
    }
    resetInactivityTimer();
  };

  const openCalculator = (currencyCode?: string) => {
    setShowCalculator(true);
    if (currencyCode && currencyCode !== 'ILS') {
      setFromCurrency('ILS');
      setToCurrency(currencyCode);
    }
    setFromAmount('');
    setToAmount('');
    setCalculationDetails('');
    startInactivityTimer();
  };

  const closeCalculator = () => {
    setShowCalculator(false);
    setFromAmount('');
    setToAmount('');
    setCalculationDetails('');
    clearInactivityTimer();
  };

  const handleProceedToTransaction = async () => {
    try {
      console.log('🔄 بدء عملية المتابعة للمعاملة...');
      console.log('📊 بيانات الآلة الحاسبة:', { fromCurrency, toCurrency, fromAmount, toAmount });
      
      // حفظ بيانات الآلة الحاسبة بشكل مفصل
      const calculatorTransactionData = {
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        calculationDetails,
        timestamp: new Date().toISOString(),
        isFromCalculator: true
      };
      
      await AsyncStorage.setItem('fromCalculator', 'true');
      await AsyncStorage.setItem('calculatorData', JSON.stringify(calculatorTransactionData));
      await AsyncStorage.setItem('calculatorTransactionReady', 'true');
      
      console.log('✅ تم حفظ بيانات الآلة الحاسبة:', calculatorTransactionData);
      
      // إغلاق الآلة الحاسبة
      closeCalculator();
      
      // الانتقال لصفحة معلومات الزبائن
      router.push('/(tabs)/customer-info');
      
    } catch (error) {
      console.error('❌ خطأ في حفظ بيانات الآلة الحاسبة:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ البيانات');
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();
    
    const timer = setTimeout(() => {
      console.log('⏰ إغلاق آلة الحاسبة تلقائياً بعد 10 ثوانٍ من عدم الاستخدام');
      closeCalculator();
    }, 10000);
    
    setInactivityTimer(timer);
  };

  const clearInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
  };

  const resetInactivityTimer = () => {
    if (showCalculator) {
      startInactivityTimer();
    }
  };

  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, []);

  const navigateToServices = async () => {
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
      console.log('تم حفظ اللغة قبل الانتقال:', language);
      
      await AsyncStorage.setItem('languageUpdateTime', Date.now().toString());
      console.log('تم حفظ وقت تحديث اللغة');
    } catch (error) {
      console.log('خطأ في حفظ اللغة:', error);
    }
    
    // الانتقال مباشرة لصفحة الخدمات
    console.log('📋 الانتقال مباشرة لصفحة الخدمات...');
    router.push('/(tabs)/services');
  };

  const navigateToSettings = () => {
    router.push('/login');
  };

  const workingHoursData = getWorkingHoursText();

  // تحديد ما إذا كانت الشاشة كبيرة أم صغيرة
  const isLargeScreen = screenData.width >= 768;

  // الحصول على الإعلان الحالي
  const currentAd = advertisements.length > 0 ? advertisements[currentAdIndex] : null;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>جاري تحميل الأسعار...</Text>
      </View>
    );
  }

  const calculatorCurrencies = [
    { code: 'ILS', name_ar: 'شيقل إسرائيلي', name_en: 'Israeli Shekel', name_he: 'שקל ישראלי' },
    ...allCurrencies.filter(c => c.is_active) // فقط العملات المتوفرة
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.settingsButton} onPress={navigateToSettings}>
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
            
            <View style={styles.languageSelector}>
              {(['ar', 'he', 'en'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langButton, language === lang && styles.activeLangButton]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[styles.langButtonText, language === lang && styles.activeLangButtonText]}>
                    {lang === 'ar' ? 'ع' : lang === 'he' ? 'ע' : 'EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {companyInfo ? (
                language === 'ar' ? companyInfo.name_ar :
                language === 'he' ? companyInfo.name_he :
                companyInfo.name_en
              ) : (
                language === 'ar' ? 'نعامنة للصرافة' :
                language === 'he' ? 'נעאמנה להמרות' :
                'Naamneh Exchange'
              )}
            </Text>
            <Text style={styles.companyAddress}>
              {companyInfo ? (
                language === 'ar' ? companyInfo.address_ar :
                language === 'he' ? companyInfo.address_he :
                companyInfo.address_en
              ) : (
                language === 'ar' ? 'عرابة الشارع الرئيسي' :
                language === 'he' ? 'ערבה הרחוב הראשי' :
                'Arraba Main Street'
              )}
            </Text>
            <Text style={styles.companyPhone}>
              {companyInfo?.phone1 || '05260000841'}
              {companyInfo?.phone2 && ` | ${companyInfo.phone2}`}
              {companyInfo?.phone3 && ` | ${companyInfo.phone3}`}
            </Text>
          </View>
        </View>

        {/* Advertisement Carousel - Above Table */}
        {currentAd && (
          <View style={styles.advertisementContainer}>
            <View style={styles.advertisementCard}>
              <Image source={{ uri: currentAd.image_url }} style={styles.adImage} resizeMode="cover" />
              <View style={styles.adContent}>
                <Text style={styles.adTitle}>{currentAd.title}</Text>
                <Text style={styles.adDescription}>{currentAd.description}</Text>
              </View>
            </View>
            
            {/* Advertisement Indicators */}
            {advertisements.length > 1 && (
              <View style={styles.adIndicators}>
                {advertisements.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.adIndicator,
                      index === currentAdIndex && styles.activeAdIndicator
                    ]}
                    onPress={() => setCurrentAdIndex(index)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Main Content Area */}
        <View style={isLargeScreen ? styles.mainContentLarge : styles.mainContentSmall}>
          {/* Center Content */}
          <View style={styles.centerContent}>
            {/* Exchange Rates Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableTitle}>
                  {language === 'ar' && 'أسعار الصرف اليوم'}
                  {language === 'he' && 'שערי החליפין היום'}
                  {language === 'en' && "Today's Exchange Rates"}
                </Text>
                <TouchableOpacity style={styles.calculatorButton} onPress={() => openCalculator()}>
                  <Text style={styles.calculatorButtonText}>🧮</Text>
                </TouchableOpacity>
              </View>

              {/* Instruction Message */}
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  {language === 'ar' && '💡 للشراء أو البيع اضغط على الجدول'}
                  {language === 'he' && '💡 לקנייה או מכירה לחץ על הטבלה'}
                  {language === 'en' && '💡 For buying or selling, click on the table'}
                </Text>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <View style={styles.currencyHeaderCell}>
                    <Text style={styles.headerText}>
                      {language === 'ar' && 'العملة'}
                      {language === 'he' && 'מטבע'}
                      {language === 'en' && 'Currency'}
                    </Text>
                  </View>
                  <View style={styles.rateHeaderCell}>
                    <Text style={styles.headerText}>
                      {language === 'ar' && 'السعر الحالي'}
                      {language === 'he' && 'שער נוכחי'}
                      {language === 'en' && 'Current Rate'}
                    </Text>
                  </View>
                  <View style={styles.rateHeaderCell}>
                    <Text style={styles.headerText}>
                      {language === 'ar' && 'نشتري'}
                      {language === 'he' && 'קונים'}
                      {language === 'en' && 'We Buy'}
                    </Text>
                  </View>
                  <View style={styles.rateHeaderCell}>
                    <Text style={styles.headerText}>
                      {language === 'ar' && 'نبيع'}
                      {language === 'he' && 'מוכרים'}
                      {language === 'en' && 'We Sell'}
                    </Text>
                  </View>
                  <View style={styles.availabilityHeaderCell}>
                    <Text style={styles.headerText}>
                      {language === 'ar' && 'الحالة'}
                      {language === 'he' && 'מצב'}
                      {language === 'en' && 'Status'}
                    </Text>
                  </View>
                </View>

                {allCurrencies.map((currency, index) => (
                  <TouchableOpacity 
                    key={currency.id} 
                    style={[
                      styles.tableRow, 
                      index % 2 === 0 ? styles.evenRow : styles.oddRow,
                      !currency.is_active && styles.unavailableRow
                    ]}
                    onPress={() => {
                      if (currency.is_active) {
                        openCalculator(currency.code);
                      } else {
                        Alert.alert(
                          language === 'ar' ? 'عملة غير متوفرة' :
                          language === 'he' ? 'מטבע לא זמין' :
                          'Currency Unavailable',
                          
                          language === 'ar' ? `عملة ${currency.name_ar} غير متوفرة حالياً. يرجى التواصل معنا للحجز المسبق.` :
                          language === 'he' ? `מטבע ${currency.name_he || currency.name_ar} לא זמין כרגע. אנא צור קשר להזמנה מראש.` :
                          `${currency.name_en} is currently unavailable. Please contact us for advance booking.`
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.currencyCell}>
                      <Text style={[styles.currencyCode, !currency.is_active && styles.unavailableText]}>
                        {currency.code}
                      </Text>
                      <Text style={[styles.currencyName, !currency.is_active && styles.unavailableText]}>
                        {language === 'ar' && currency.name_ar}
                        {language === 'he' && (currency.name_he || currency.name_ar)}
                        {language === 'en' && currency.name_en}
                      </Text>
                    </View>
                    <View style={styles.rateCell}>
                      <Text style={[styles.currentRate, !currency.is_active && styles.unavailableText]}>
                        {currency.current_rate?.toFixed(2) || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.rateCell}>
                      <Text style={[styles.buyRate, !currency.is_active && styles.unavailableText]}>
                        {currency.buy_rate?.toFixed(2) || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.rateCell}>
                      <Text style={[styles.sellRate, !currency.is_active && styles.unavailableText]}>
                        {currency.sell_rate?.toFixed(2) || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.availabilityCell}>
                      <Text 
                        style={[
                          styles.availabilityIcon,
                          currency.is_active ? styles.availableIcon : styles.unavailableIcon
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {currency.is_active ? '✅' : '⚠️'}
                      </Text>
                      <Text style={styles.tooltipText}>
                        {currency.is_active ? (
                          language === 'ar' ? 'متاحة' :
                          language === 'he' ? 'זמין' :
                          'Available'
                        ) : (
                          language === 'ar' ? 'تحتاج لتوصية' :
                          language === 'he' ? 'דרוש הזמנה' :
                          'Needs Booking'
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Working Hours (Small Screens) */}
            {!isLargeScreen && (
              <View style={styles.workingHoursContainer}>
                <Text style={styles.workingHoursTitle}>
                  {language === 'ar' && 'ساعات العمل'}
                  {language === 'he' && 'שעות פעילות'}
                  {language === 'en' && 'Working Hours'}
                </Text>
                <View style={styles.workingHoursContent}>
                  <Text style={styles.workingHoursText}>🕐 {workingHoursData.morning}</Text>
                  <Text style={styles.workingHoursText}>🕐 {workingHoursData.evening}</Text>
                </View>
                <Text style={styles.workingDaysText}>
                  📅 {getWorkingDaysText()}
                </Text>
              </View>
            )}
          </View>

          {/* Right Side - Working Hours (Large Screens) */}
          {isLargeScreen && (
            <View style={styles.workingHoursContainerLarge}>
              <Text style={styles.workingHoursTitle}>
                {language === 'ar' && 'ساعات العمل'}
                {language === 'he' && 'שעות פעילות'}
                {language === 'en' && 'Working Hours'}
              </Text>
              <View style={styles.workingHoursContent}>
                <Text style={styles.workingHoursText}>🕐 {workingHoursData.morning}</Text>
                <Text style={styles.workingHoursText}>🕐 {workingHoursData.evening}</Text>
              </View>
              <Text style={styles.workingDaysText}>
                📅 {getWorkingDaysText()}
              </Text>
            </View>
          )}
        </View>

        {/* Customer Service Button */}
        <TouchableOpacity style={styles.customerButton} onPress={navigateToServices}>
          <Text style={styles.customerButtonText}>
            {language === 'ar' && '👤 خدمة الزبائن'}
            {language === 'he' && '👤 שירות לקוחות'}
            {language === 'en' && '👤 Customer Service'}
          </Text>
        </TouchableOpacity>

        {/* Calculator Modal */}
        <Modal
          visible={showCalculator}
          transparent={true}
          animationType="slide"
          onRequestClose={closeCalculator}
        >
          <View 
            style={styles.modalOverlay}
            onTouchStart={resetInactivityTimer}
          >
            <View style={styles.calculatorModal}>
              <View style={styles.calculatorHeader}>
                <Text style={styles.calculatorTitle}>
                  {language === 'ar' && 'آلة حاسبة العملات'}
                  {language === 'he' && 'מחשבון מטבעות'}
                  {language === 'en' && 'Currency Calculator'}
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeCalculator}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calculatorContent}>
                <ScrollView 
                  showsVerticalScrollIndicator={true} 
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  onTouchStart={resetInactivityTimer}
                >
                  <View style={styles.currencySection}>
                    <Text style={styles.sectionLabel}>
                      {language === 'ar' && 'اختيار العملات'}
                      {language === 'he' && 'בחירת מטבעות'}
                      {language === 'en' && 'Select Currencies'}
                    </Text>
                    <View style={styles.currencySelectionRow}>
                      <TouchableOpacity 
                        style={styles.currencyButton}
                        onPress={() => {
                          cycleCurrency(fromCurrency, true);
                          resetInactivityTimer();
                        }}
                      >
                        <Text style={styles.currencyButtonCode}>{fromCurrency}</Text>
                        <Text style={styles.currencyButtonName}>
                          {fromCurrency === 'ILS' ? (
                            language === 'ar' ? 'شيقل إسرائيلي' :
                            language === 'he' ? 'שקל ישראלי' :
                            'Israeli Shekel'
                          ) : (
                            language === 'ar' ? allCurrencies.find(c => c.code === fromCurrency)?.name_ar :
                            language === 'he' ? allCurrencies.find(c => c.code === fromCurrency)?.name_he :
                            allCurrencies.find(c => c.code === fromCurrency)?.name_en
                          ) || fromCurrency}
                        </Text>
                        <Text style={styles.tapHint}>
                          {language === 'ar' && 'اضغط للتبديل'}
                          {language === 'he' && 'לחץ להחלפה'}
                          {language === 'en' && 'Tap to switch'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.swapButton} 
                        onPress={() => {
                          swapCurrencies();
                          resetInactivityTimer();
                        }}
                      >
                        <Text style={styles.swapButtonText}>⇅</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.currencyButton}
                        onPress={() => {
                          cycleCurrency(toCurrency, false);
                          resetInactivityTimer();
                        }}
                      >
                        <Text style={styles.currencyButtonCode}>{toCurrency}</Text>
                        <Text style={styles.currencyButtonName}>
                          {toCurrency === 'ILS' ? (
                            language === 'ar' ? 'شيقل إسرائيلي' :
                            language === 'he' ? 'שקל ישראלי' :
                            'Israeli Shekel'
                          ) : (
                            language === 'ar' ? allCurrencies.find(c => c.code === toCurrency)?.name_ar :
                            language === 'he' ? allCurrencies.find(c => c.code === toCurrency)?.name_he :
                            allCurrencies.find(c => c.code === toCurrency)?.name_en
                          ) || toCurrency}
                        </Text>
                        <Text style={styles.tapHint}>
                          {language === 'ar' && 'اضغط للتبديل'}
                          {language === 'he' && 'לחץ להחלפה'}
                          {language === 'en' && 'Tap to switch'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.currencySection}>
                    <Text style={styles.sectionLabel}>
                      {language === 'ar' && 'المبالغ'}
                      {language === 'he' && 'סכומים'}
                      {language === 'en' && 'Amounts'}
                    </Text>
                    <View style={styles.amountInputRow}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.currencyLabel}>{fromCurrency}</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={fromAmount}
                          onChangeText={handleFromAmountChange}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.currencyLabel}>{toCurrency}</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={toAmount}
                          onChangeText={handleToAmountChange}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {calculationDetails && (
                    <View style={styles.calculationDetails}>
                      <Text style={styles.calculationText}>{calculationDetails}</Text>
                    </View>
                  )}

                  <View style={styles.ratesInfo}>
                    {fromCurrency !== 'ILS' && (
                      <Text style={styles.rateInfoText}>
                        {fromCurrency}: {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'} {allCurrencies.find(c => c.code === fromCurrency)?.buy_rate?.toFixed(2) || 'N/A'} | 
                        <Text>{language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'} {allCurrencies.find(c => c.code === fromCurrency)?.sell_rate?.toFixed(2) || 'N/A'}</Text>
                      </Text>
                    )}
                    {toCurrency !== 'ILS' && (
                      <Text style={styles.rateInfoText}>
                        {toCurrency}: {language === 'ar' ? 'شراء' : language === 'he' ? 'קנייה' : 'Buy'} {allCurrencies.find(c => c.code === toCurrency)?.buy_rate?.toFixed(2) || 'N/A'} | 
                        <Text>{language === 'ar' ? 'بيع' : language === 'he' ? 'מכירה' : 'Sell'} {allCurrencies.find(c => c.code === toCurrency)?.sell_rate?.toFixed(2) || 'N/A'}</Text>
                      </Text>
                    )}
                  </View>

                  {fromAmount && toAmount && (
                    <TouchableOpacity 
                      style={styles.proceedButton} 
                      onPress={() => {
                        handleProceedToTransaction();
                        resetInactivityTimer();
                      }}
                    >
                      <Text style={styles.proceedButtonText}>
                        {language === 'ar' && 'المتابعة للمعاملة'}
                        {language === 'he' && 'המשך לעסקה'}
                        {language === 'en' && 'Proceed to Transaction'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollContainer: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 2,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  activeLangButton: {
    backgroundColor: '#059669',
  },
  langButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  activeLangButtonText: {
    color: '#FFFFFF',
  },
  companyInfo: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 5,
    textAlign: 'center',
  },
  companyAddress: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 5,
    textAlign: 'center',
  },
  companyPhone: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Advertisement Carousel Styles
  advertisementContainer: {
    marginVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  advertisementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  adImage: {
    width: '100%',
    height: 120,
  },
  adContent: {
    padding: 15,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
    textAlign: 'center',
  },
  adDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },
  adIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  adIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  activeAdIndicator: {
    backgroundColor: '#059669',
  },
  // Main Content Layout
  mainContentLarge: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 20,
  },
  mainContentSmall: {
    paddingHorizontal: 20,
  },
  centerContent: {
    flex: 1,
  },
  // Working Hours Styles
  workingHoursContainer: {
    backgroundColor: '#1F2937',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  workingHoursContainerLarge: {
    backgroundColor: '#1F2937',
    width: 250,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  workingHoursTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  workingHoursContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  workingHoursText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  workingDaysText: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  calculatorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculatorButtonText: {
    fontSize: 20,
  },
  // Instruction Message
  instructionContainer: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  instructionText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '600',
  },
  table: {
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
  },
  currencyHeaderCell: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityHeaderCell: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F9FAFB',
  },
  unavailableRow: {
    backgroundColor: '#FEF3C7',
    opacity: 0.8,
  },
  currencyCell: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currencyName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  unavailableText: {
    color: '#92400E',
    opacity: 0.7,
  },
  rateCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  buyRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  sellRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  availabilityCell: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  availabilityIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  availableIcon: {
    color: '#059669',
  },
  unavailableIcon: {
    color: '#F59E0B',
  },
  tooltipText: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  customerButton: {
    backgroundColor: '#059669',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  customerButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Calculator Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calculatorModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calculatorContent: {
    flex: 1,
    padding: 15,
  },
  currencySection: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  currencySelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  currencyButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  currencyButtonCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  currencyButtonName: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  tapHint: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  amountInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
    paddingHorizontal: 10,
  },
  currencyLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 5,
    textAlign: 'center',
  },
  amountInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 10,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    fontWeight: 'bold',
    textAlign: 'center',
    width: 120,
    height: 45,
  },
  swapContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  swapButton: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  swapButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calculationDetails: {
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  calculationText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  ratesInfo: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  rateInfoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 5,
  },
  proceedButton: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});