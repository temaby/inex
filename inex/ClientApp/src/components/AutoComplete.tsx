import * as React from "react";
import { AutoComplete } from "antd";

import { useState } from "react";

const TagsComplete = (props: any) => {
  const [options, setOptions] = useState([]);

  const { tags, refs } = props;

  const handleSearch = (value: string) => {
    let searchOptions: any = [];

    if (value.toLowerCase().startsWith("@")) {
        // search refs
        const searchValue: string = value.substring(1);
        searchOptions = refs.filter((option: string) => option.toLowerCase().includes(searchValue.toLowerCase()));
    } if (value.toLowerCase().startsWith("#")) {
        // search tags
        const searchValue: string = value.substring(1);
        searchOptions = tags.filter((option: string) => option.toLowerCase().includes(searchValue.toLowerCase()));
    }      

    setOptions(searchOptions);
  };

  return <AutoComplete options={options.map((option) => ({ value: option }))} onSearch={handleSearch} />;
};

export default TagsComplete;
