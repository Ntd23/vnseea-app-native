// Description: Renders reusable address-only search content without owning a native modal.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, ChevronRight, MapPin, Search, X } from 'lucide-react-native';
import { useAppLanguage } from '../../application/hooks/useAppLanguage';
import { createAsyncResourceCache } from '../../application/utils/asyncResourceCache';
import type {
  AddressLocationBias,
  AddressSearchLanguage,
  AddressSuggestion,
  ResolvedAddress,
} from '../../domain/types/addressSearch.types';
import {
  createAddressSearchRepository,
  createAddressSessionToken,
  resolveAddressLocationBias,
} from '../../infrastructure/address/ApiAddressSearchRepository';
import { APP_BRAND_COLOR, APP_COLORS } from '../theme/appColors';

const repository = createAddressSearchRepository();
const suggestionCache = createAsyncResourceCache<AddressSuggestion[]>({
  ttlMs: 2 * 60 * 1000,
  maxEntries: 80,
});
const detailsCache = createAsyncResourceCache<ResolvedAddress>({
  ttlMs: 10 * 60 * 1000,
  maxEntries: 160,
});
const MIN_SEARCH_CHARS = 2;

const COPY = {
  vi: {
    title: 'Tìm địa chỉ',
    placeholder: 'Nhập số nhà, ngõ, đường, phường/xã...',
    minChars: 'Nhập ít nhất 2 ký tự để tìm địa chỉ.',
    empty: 'Không tìm thấy địa chỉ phù hợp.',
    error: 'Không thể tìm địa chỉ lúc này. Nội dung bạn nhập vẫn được giữ lại.',
    searching: 'Đang tìm địa chỉ...',
    attribution: 'Google Maps',
  },
  en: {
    title: 'Search address',
    placeholder: 'Enter house number, street, ward...',
    minChars: 'Enter at least 2 characters to search.',
    empty: 'No matching address was found.',
    error: 'Address search is unavailable. Your typed address is preserved.',
    searching: 'Searching addresses...',
    attribution: 'Google Maps',
  },
} as const;

export type AddressSearchContentProps = {
  initialQuery?: string;
  placeholder?: string;
  locationBias?: AddressLocationBias;
  debounceMs?: number;
  autoFocus?: boolean;
  showHeader?: boolean;
  onClose?: () => void;
  onQueryChange: (value: string) => void;
  onResolvedAddress: (
    address: ResolvedAddress,
    suggestion: AddressSuggestion,
  ) => void;
};

function normalizeCacheQuery(query: string) {
  return query.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function AddressSearchContent({
  initialQuery = '',
  placeholder,
  locationBias,
  debounceMs = 300,
  autoFocus = true,
  showHeader = true,
  onClose,
  onQueryChange,
  onResolvedAddress,
}: AddressSearchContentProps) {
  const appLanguage = useAppLanguage();
  const language: AddressSearchLanguage =
    appLanguage === 'en' ? 'en' : 'vi';
  const copy = COPY[language];
  const sessionTokenRef = useRef(createAddressSessionToken());
  const inputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const detailsRequestIdRef = useRef(0);
  const didInitialSearchRef = useRef(false);
  const latestQueryRef = useRef(initialQuery);
  const resolvedLocationBiasRef = useRef(
    resolveAddressLocationBias(locationBias),
  );
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const resolvedLocationBias = resolvedLocationBiasRef.current;

  const searchInput = useMemo(
    () => ({
      language,
      country: 'vn' as const,
      locationBias: resolvedLocationBias,
      sessionToken: sessionTokenRef.current,
    }),
    [language, resolvedLocationBias],
  );

  useEffect(() => {
    if (!autoFocus) return;
    focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [autoFocus]);

  useEffect(
    () => () => {
      searchRequestIdRef.current += 1;
      detailsRequestIdRef.current += 1;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    },
    [],
  );

  const search = useCallback(
    async (rawQuery: string, forceGeocode = false) => {
      const trimmed = rawQuery.trim();
      const requestId = ++searchRequestIdRef.current;
      detailsRequestIdRef.current += 1;
      if (trimmed.length < MIN_SEARCH_CHARS) {
        setSuggestions([]);
        setErrorMessage('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      try {
        const cacheKey = [
          sessionTokenRef.current,
          language,
          forceGeocode ? 'geocode' : 'autocomplete',
          resolvedLocationBias?.latitude ?? '',
          resolvedLocationBias?.longitude ?? '',
          normalizeCacheQuery(trimmed),
        ].join(':');
        const nextSuggestions = await suggestionCache.getOrLoad(
          cacheKey,
          async () => {
            if (forceGeocode) {
              return repository.geocodeAddress({
                ...searchInput,
                query: trimmed,
              });
            }
            return repository.searchAddresses({
              ...searchInput,
              query: trimmed,
            });
          },
        );

        if (
          requestId !== searchRequestIdRef.current ||
          rawQuery !== latestQueryRef.current
        ) {
          return;
        }
        setSuggestions(nextSuggestions);
        setErrorMessage(nextSuggestions.length === 0 ? copy.empty : '');
      } catch {
        if (
          requestId !== searchRequestIdRef.current ||
          rawQuery !== latestQueryRef.current
        ) {
          return;
        }
        setSuggestions([]);
        setErrorMessage(copy.error);
      } finally {
        if (
          requestId === searchRequestIdRef.current &&
          rawQuery === latestQueryRef.current
        ) {
          setIsLoading(false);
        }
      }
    },
    [copy.empty, copy.error, language, resolvedLocationBias, searchInput],
  );

  useEffect(() => {
    if (didInitialSearchRef.current) return;
    didInitialSearchRef.current = true;
    if (initialQuery.trim().length >= MIN_SEARCH_CHARS) {
      search(initialQuery);
    }
  }, [initialQuery, search]);

  const handleTextChange = useCallback(
    (value: string) => {
      latestQueryRef.current = value;
      searchRequestIdRef.current += 1;
      detailsRequestIdRef.current += 1;
      setQuery(value);
      onQueryChange(value);
      setSuggestions([]);
      setErrorMessage('');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (value.trim().length < MIN_SEARCH_CHARS) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        search(value);
      }, debounceMs);
    },
    [debounceMs, onQueryChange, search],
  );

  const handleSubmitEditing = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    search(query, true);
  }, [query, search]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: AddressSuggestion) => {
      searchRequestIdRef.current += 1;
      const detailsRequestId = ++detailsRequestIdRef.current;
      setIsLoading(true);
      setErrorMessage('');
      try {
        const detailsKey = `${sessionTokenRef.current}:${suggestion.placeId}`;
        const resolved = await detailsCache.getOrLoad(detailsKey, () =>
          repository.resolveAddressSuggestion(suggestion, {
            language,
            country: 'vn',
            sessionToken: sessionTokenRef.current,
          }),
        );
        if (detailsRequestId !== detailsRequestIdRef.current) return;
        latestQueryRef.current = resolved.formattedAddress;
        setQuery(resolved.formattedAddress);
        setSuggestions([]);
        onQueryChange(resolved.formattedAddress);
        onResolvedAddress(resolved, suggestion);
        Keyboard.dismiss();
      } catch {
        if (detailsRequestId === detailsRequestIdRef.current) {
          setErrorMessage(copy.error);
        }
      } finally {
        if (detailsRequestId === detailsRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [copy.error, language, onQueryChange, onResolvedAddress],
  );

  const clearQuery = useCallback(() => {
    latestQueryRef.current = '';
    searchRequestIdRef.current += 1;
    detailsRequestIdRef.current += 1;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuery('');
    setSuggestions([]);
    setErrorMessage('');
    setIsLoading(false);
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange]);

  return (
    <View style={styles.root}>
      {showHeader ? (
        <View style={styles.header}>
          {onClose ? (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={language === 'vi' ? 'Quay lại' : 'Back'}
            >
              <ArrowLeft size={21} color="#0F172A" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={styles.title}>{copy.title}</Text>
          <View style={styles.headerButton} />
        </View>
      ) : null}

      <View style={styles.searchContainer}>
        <Search size={19} color={APP_BRAND_COLOR} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmitEditing}
          placeholder={placeholder || copy.placeholder}
          placeholderTextColor="#94A3B8"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
        ) : query ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearQuery}
            accessibilityRole="button"
            accessibilityLabel={language === 'vi' ? 'Xóa địa chỉ' : 'Clear address'}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>

      {query.trim().length > 0 &&
      query.trim().length < MIN_SEARCH_CHARS ? (
        <Text style={styles.helperText}>{copy.minChars}</Text>
      ) : null}

      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => item.placeId || `${item.description}-${index}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.suggestion}
            activeOpacity={0.75}
            onPress={() => handleSelectSuggestion(item)}
          >
            <View style={styles.pin}>
              <MapPin size={18} color={APP_BRAND_COLOR} />
            </View>
            <View style={styles.suggestionText}>
              <Text style={styles.mainText} numberOfLines={2}>
                {item.mainText || item.description}
              </Text>
              {item.secondaryText ? (
                <Text style={styles.secondaryText} numberOfLines={2}>
                  {item.secondaryText}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading && errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : isLoading ? (
            <Text style={styles.helperText}>{copy.searching}</Text>
          ) : null
        }
        ListFooterComponent={
          query.trim().length >= MIN_SEARCH_CHARS ? (
            <Text style={styles.attribution}>{copy.attribution}</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  searchContainer: {
    minHeight: 54,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: APP_COLORS.brand.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 0,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    paddingHorizontal: 20,
    paddingTop: 14,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 24,
  },
  suggestion: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  pin: {
    width: 40,
    height: 40,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: APP_COLORS.brand.soft,
  },
  suggestionText: {
    flex: 1,
    marginRight: 8,
  },
  mainText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    paddingHorizontal: 20,
    paddingTop: 14,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  attribution: {
    paddingVertical: 8,
    textAlign: 'center',
    color: '#5E5E5E',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0,
  },
});

export default AddressSearchContent;
