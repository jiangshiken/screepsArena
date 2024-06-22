/**
 * @param {Object} target
 * @returns {string}
 */
export function getTypeNameOf(target)
{
	var funcNameRegex = /function (.{1,})\(/;
	var results = (funcNameRegex).exec((target).constructor.toString());
	return (results && results.length > 1) ? results[1] : "";
}
