// filter collection by a key (that's an array) looking for value
// {% set collection = collections._posts | wherearr('arraykey', 'value') %}
export function wherearr(collections, key, value) {
	return collections.filter((item) => {
		const data = item && item.data ? item.data : item;
		return typeof value === 'undefined' ? key in data : data[key].includes(value);
	});
}
