import React from 'react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLang = event.target.value;
    void i18n.changeLanguage(newLang);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        inputProps={{ 'aria-label': 'Language' }}
        sx={{
          color: 'inherit',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
          },
          '& .MuiSvgIcon-root': {
            color: 'inherit',
          },
        }}
      >
        <MenuItem value="tr">Türkçe</MenuItem>
        <MenuItem value="en">English</MenuItem>
      </Select>
    </FormControl>
  );
};

