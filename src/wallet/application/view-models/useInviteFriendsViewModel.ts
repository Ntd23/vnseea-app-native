// InviteFriends ViewModel — UI-only phase, mock contacts

import {useState, useCallback, useMemo} from 'react';
import type {Contact} from '../../domain/types/wallet.types';

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Ahieu',
    phone: '090 123 4567',
    initials: 'AH',
    chipBg: 'bg-[#eef0ff]',
    chipText: 'text-[#0000ff]',
    isInvited: false,
  },
  {
    id: '2',
    name: 'Anh Nguyên',
    phone: '091 987 6543',
    initials: 'AN',
    chipBg: 'bg-[#d3e4fe]',
    chipText: 'text-[#0000ff]',
    isInvited: false,
  },
  {
    id: '3',
    name: 'Bảo Anh',
    phone: '098 765 4321',
    initials: 'BA',
    chipBg: 'bg-[#d0e1fb]',
    chipText: 'text-[#505f76]',
    isInvited: false,
  },
  {
    id: '4',
    name: 'Châu Minh',
    phone: '093 456 7890',
    initials: 'CM',
    chipBg: 'bg-[#941d14]',
    chipText: 'text-white',
    isInvited: false,
  },
  {
    id: '5',
    name: 'Đức Hùng',
    phone: '097 234 5678',
    initials: 'ĐH',
    chipBg: 'bg-[#eef0ff]',
    chipText: 'text-[#0000ff]',
    isInvited: false,
  },
  {
    id: '6',
    name: 'Minh Tâm',
    phone: '086 345 6789',
    initials: 'MT',
    chipBg: 'bg-[#d3e4fe]',
    chipText: 'text-[#0000ff]',
    isInvited: false,
  },
];

export function useInviteFriendsViewModel() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
    );
  }, [contacts, searchQuery]);

  const handleInvite = useCallback((id: string) => {
    setContacts(prev =>
      prev.map(c => (c.id === id ? {...c, isInvited: true} : c)),
    );
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    contacts: filteredContacts,
    searchQuery,
    isLoading,
    handleInvite,
    handleSearch,
  };
}
