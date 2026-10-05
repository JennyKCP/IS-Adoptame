import StatusPage from "../../../components/StatusPage";

const Page = () => {
  return (
    <StatusPage
      type="notFound"
      itemName="Mascota"
      buttonGoTo="Mascotas"
      redirectUrl="/pets"
    />
  );
};

export default Page;
