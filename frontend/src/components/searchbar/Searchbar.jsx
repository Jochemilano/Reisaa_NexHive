import React from "react";
import { FaSearch } from "react-icons/fa";
import "./Searchbar.css";

const SearchBar = ({ placeholder = "Buscar...", onChange }) => {
  return (
    <div className="search-container">
      <FaSearch className="search-icon" />
      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
};

export default SearchBar;
